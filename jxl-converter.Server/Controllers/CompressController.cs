using jxl_converter.Server.Models;
using jxl_converter.Server.Services;
using Microsoft.AspNetCore.Mvc;
using System.Diagnostics;
using System.Text;

namespace jxl_converter.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CompressController : ControllerBase
    {
        private readonly TempFileStorageService _storageService;
        private readonly ILogger<CompressController> _logger;

        public CompressController(TempFileStorageService storageService, ILogger<CompressController> logger)
        {
            _storageService = storageService;
            _logger = logger;
        }

        [HttpPost]
        [RequestSizeLimit(250 * 1024 * 1024)] // 250 MB sınırı (byte cinsinden)

        public async Task<IActionResult> Post([FromForm] CompressionRequest request)
        {
            if (request.File == null || request.File.Length == 0)
                return BadRequest(new { message = "No file uploaded." });

            var tempInputPath = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());
            var tempOutputPath = Path.ChangeExtension(tempInputPath, ".jxl");

            try
            {
                await using (var stream = new FileStream(tempInputPath, FileMode.Create))
                {
                    await request.File.CopyToAsync(stream);
                }

                var arguments = BuildArguments(request, tempInputPath, tempOutputPath);
                _logger.LogInformation("Attempting cjxl with optimal arguments: {args}", arguments);

                (int exitCode, string error) result = await RunCjxlProcess(arguments);

                if (result.exitCode != 0 && result.error.Contains("JPEG bitstream reconstruction data could not be created"))
                {
                    _logger.LogWarning("Optimal cjxl failed with reconstruction error. Retrying with fallback arguments.");
                    var fallbackArguments = BuildArguments(request, tempInputPath, tempOutputPath, useFallback: true);
                    _logger.LogInformation("Retrying cjxl with fallback arguments: {args}", fallbackArguments);
                    result = await RunCjxlProcess(fallbackArguments);
                }

                if (result.exitCode != 0)
                {
                    _logger.LogError("cjxl final attempt failed. Exit Code: {code}. Error: {error}", result.exitCode, result.error);
                    return StatusCode(500, new { message = $"Compression failed: {result.error}" });
                }

                var downloadId = Guid.NewGuid().ToString();
                _storageService.AddFile(downloadId, tempOutputPath);

                var originalSize = new FileInfo(tempInputPath).Length;
                var newSize = new FileInfo(tempOutputPath).Length;

                return Ok(new
                {
                    originalSize = originalSize,
                    newSize = newSize,
                    reductionPercentage = originalSize > 0 ? ((originalSize - newSize) / (double)originalSize * 100).ToString("F1") : "0.0",
                    downloadUrl = $"/api/download/{downloadId}",
                    newFileName = Path.GetFileNameWithoutExtension(request.File.FileName) + ".jxl"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An unexpected error occurred during compression.");
                return StatusCode(500, new { message = "An unexpected server error occurred." });
            }
            finally
            {
                if (System.IO.File.Exists(tempInputPath))
                    System.IO.File.Delete(tempInputPath);
            }
        }

        private async Task<(int, string)> RunCjxlProcess(string arguments)
        {
            using var process = new Process
            {
                StartInfo = new ProcessStartInfo
                {
                    FileName = "/usr/local/bin/cjxl",
                    Arguments = arguments,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true,
                    Environment = { ["LD_LIBRARY_PATH"] = "/usr/local/lib" }
                }
            };
            process.Start();
            string error = await process.StandardError.ReadToEndAsync();
            string output = await process.StandardOutput.ReadToEndAsync();
            await process.WaitForExitAsync();
            if (process.ExitCode != 0)
            {
                _logger.LogInformation("cjxl stdout: {output}", output);
            }
            return (process.ExitCode, error);
        }

        private string BuildArguments(CompressionRequest request, string input, string output, bool useFallback = false)
        {
            var args = new StringBuilder();
            args.Append($"\"{input}\" \"{output}\"");

            bool isJpeg = request.File.ContentType == "image/jpeg";

            if (request.Lossless)
            {
                if (isJpeg && useFallback)
                {
                    args.Append(" -q 100 --allow_jpeg_reconstruction 0");
                }
                else if (isJpeg && request.JpegReconstruction)
                {
                    args.Append(" --lossless_jpeg=1");
                }
                else
                {
                    args.Append(" -q 100");
                }
            }
            else
            {
                args.Append($" -q {request.Quality}");
            }

            args.Append($" --effort {request.Effort}");

            if (request.Progressive)
            {
                args.Append(" --progressive");
            }

            return args.ToString();
        }
    }
}