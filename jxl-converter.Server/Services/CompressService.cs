using jxl_converter.Server.Models;
using System.Diagnostics;
using System.Text;

namespace jxl_converter.Server.Services
{
    public class CompressService : ICompressService
    {
        private readonly TempFileStorageService _storageService;
        private readonly ILogger<CompressService> _logger;

        private static readonly HashSet<string> CjxlSupportedTypes = new HashSet<string>
        {
            "image/jpeg", "image/png", "image/gif", "image/x-exr"
        };

        public CompressService(TempFileStorageService storageService, ILogger<CompressService> logger)
        {
            _storageService = storageService;
            _logger = logger;
        }

        public async Task<CompressionResult> CompressImageAsync(CompressionRequest request)
        {
            var tempInputPath = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString() + Path.GetExtension(request.File.FileName));
            var tempOutputPath = Path.ChangeExtension(tempInputPath, ".jxl");
            string pathForCjxl = null;
            string intermediatePngPath = null;

            try
            {
                await using (var stream = new FileStream(tempInputPath, FileMode.Create))
                {
                    await request.File.CopyToAsync(stream);
                }

                pathForCjxl = tempInputPath;

                if (!CjxlSupportedTypes.Contains(request.File.ContentType))
                {
                    _logger.LogInformation("Unsupported format '{format}'. Converting to PNG with ffmpeg.", request.File.ContentType);
                    intermediatePngPath = Path.ChangeExtension(tempInputPath, ".png");

                    var ffmpegResult = await RunProcessAsync("ffmpeg", $"-i \"{tempInputPath}\" \"{intermediatePngPath}\"");
                    if (ffmpegResult.ExitCode != 0)
                    {
                        var error = $"File conversion to PNG failed. It might be a corrupted or unsupported file type. Error: {ffmpegResult.StdError}";
                        _logger.LogError("ffmpeg conversion failed. Exit Code: {code}. Error: {error}", ffmpegResult.ExitCode, ffmpegResult.StdError);
                        return new CompressionResult { Success = false, ErrorMessage = error };
                    }
                    pathForCjxl = intermediatePngPath;
                    _logger.LogInformation("Successfully converted to PNG: {path}", pathForCjxl);
                }

                var cjxlResult = await ExecuteCjxlCompression(request, pathForCjxl, tempOutputPath);

                if (cjxlResult.ExitCode != 0)
                {
                    var error = $"Compression failed: {cjxlResult.StdError}";
                    _logger.LogError("cjxl final attempt failed. Exit Code: {code}. Error: {error}", cjxlResult.ExitCode, cjxlResult.StdError);
                    return new CompressionResult { Success = false, ErrorMessage = error };
                }

                var downloadId = Guid.NewGuid().ToString();
                _storageService.AddFile(downloadId, tempOutputPath);

                return new CompressionResult
                {
                    Success = true,
                    OriginalSize = request.File.Length,
                    NewSize = new FileInfo(tempOutputPath).Length,
                    DownloadId = downloadId,
                    NewFileName = Path.GetFileNameWithoutExtension(request.File.FileName) + ".jxl"
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An unexpected error occurred during compression.");
                return new CompressionResult { Success = false, ErrorMessage = "An unexpected server error occurred." };
            }
            finally
            {

                if (System.IO.File.Exists(tempInputPath))
                {
                    System.IO.File.Delete(tempInputPath);
                }
                if (!string.IsNullOrEmpty(intermediatePngPath) && System.IO.File.Exists(intermediatePngPath))
                {
                    System.IO.File.Delete(intermediatePngPath);
                }
            }
        }

        private async Task<(int ExitCode, string StdOutput, string StdError)> ExecuteCjxlCompression(CompressionRequest request, string inputPath, string outputPath)
        {
            var arguments = BuildCjxlArguments(request, inputPath, outputPath);
            _logger.LogInformation("Attempting cjxl with arguments: {args}", arguments);

            var cjxlResult = await RunProcessAsync("/usr/local/bin/cjxl", arguments, new Dictionary<string, string> { ["LD_LIBRARY_PATH"] = "/usr/local/lib" });

            if (cjxlResult.ExitCode != 0 && cjxlResult.StdError.Contains("JPEG bitstream reconstruction data could not be created"))
            {
                _logger.LogWarning("Optimal cjxl failed. Retrying with fallback arguments.");
                var fallbackArguments = BuildCjxlArguments(request, inputPath, outputPath, useFallback: true);
                _logger.LogInformation("Retrying cjxl with fallback arguments: {args}", fallbackArguments);
                cjxlResult = await RunProcessAsync("/usr/local/bin/cjxl", fallbackArguments, new Dictionary<string, string> { ["LD_LIBRARY_PATH"] = "/usr/local/lib" });
            }

            return cjxlResult;
        }

        private string BuildCjxlArguments(CompressionRequest request, string input, string output, bool useFallback = false)
        {
            var args = new StringBuilder($"\"{input}\" \"{output}\"");
            bool isOriginalFileJpeg = request.File.ContentType == "image/jpeg";

            if (request.Lossless)
            {
                if (isOriginalFileJpeg && useFallback) args.Append(" -q 100 --allow_jpeg_reconstruction 0");
                else if (isOriginalFileJpeg && request.JpegReconstruction) args.Append(" --lossless_jpeg=1");
                else args.Append(" -q 100");
            }
            else
            {
                args.Append($" -q {request.Quality}");
            }

            args.Append($" --effort {request.Effort}");
            if (request.Progressive) args.Append(" --progressive");

            return args.ToString();
        }

        private async Task<(int ExitCode, string StdOutput, string StdError)> RunProcessAsync(string fileName, string arguments, Dictionary<string, string> envVars = null)
        {
            using var process = new Process { StartInfo = new ProcessStartInfo { FileName = fileName, Arguments = arguments, RedirectStandardOutput = true, RedirectStandardError = true, UseShellExecute = false, CreateNoWindow = true, } };
            if (envVars != null) { foreach (var envVar in envVars) { process.StartInfo.Environment[envVar.Key] = envVar.Value; } }

            process.Start();
            string output = await process.StandardOutput.ReadToEndAsync();
            string error = await process.StandardError.ReadToEndAsync();
            await process.WaitForExitAsync();

            if (process.ExitCode != 0) _logger.LogInformation("Process '{fileName}' stdout: {output}", fileName, output);
            return (process.ExitCode, output, error);
        }
    }
}
