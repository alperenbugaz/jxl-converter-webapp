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
        public async Task<IActionResult> Post([FromForm] CompressionRequest request)
        {
            if (request.File == null || request.File.Length == 0)
                return BadRequest(new { message = "No file uploaded." });

            // Docker konteyneri içinde çalışacak geçici dosya yolları
            var tempInputPath = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());
            var tempOutputPath = Path.ChangeExtension(tempInputPath, ".jxl");

            try
            {
                await using (var stream = new FileStream(tempInputPath, FileMode.Create))
                {
                    await request.File.CopyToAsync(stream);
                }

                var arguments = BuildArguments(request, tempInputPath, tempOutputPath);
                _logger.LogInformation("Executing cjxl with arguments: {args}", arguments);

                // --- DEĞİŞİKLİK BURADA ---
                // Artık cjxl'in yolunu belirtmiyoruz. Dockerfile onu sisteme kurduğu için
                // doğrudan adıyla çağırabiliyoruz.
                using var process = new Process
                {
                    StartInfo = new ProcessStartInfo
                    {
                        FileName = "cjxl",
                        Arguments = arguments,
                        RedirectStandardOutput = true,
                        RedirectStandardError = true,
                        UseShellExecute = false,
                        CreateNoWindow = true
                    }
                };

                process.Start();
                string error = await process.StandardError.ReadToEndAsync();
                await process.WaitForExitAsync();

                if (process.ExitCode != 0)
                {
                    _logger.LogError("cjxl failed. Exit Code: {code}. Error: {error}", process.ExitCode, error);
                    return StatusCode(500, new { message = $"Compression failed: {error}" });
                }

                var downloadId = Guid.NewGuid().ToString();
                _storageService.AddFile(downloadId, tempOutputPath);

                return Ok(new
                {
                    originalSize = new FileInfo(tempInputPath).Length,
                    newSize = new FileInfo(tempOutputPath).Length,
                    reductionPercentage = ((new FileInfo(tempInputPath).Length - new FileInfo(tempOutputPath).Length) / (double)new FileInfo(tempInputPath).Length * 100).ToString("F1"),
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

                // İndirme işlemi yapılana kadar çıktı dosyası silinmemeli
            }
        }

        private string BuildArguments(CompressionRequest request, string input, string output)
        {
            var args = new StringBuilder();
            args.Append($"\"{input}\" \"{output}\"");

            if (request.Lossless)
                args.Append(" -q 100");
            else
                args.Append($" -q {request.Quality}");

            args.Append($" --effort {request.Effort}");

            if (request.Progressive)
                args.Append(" --progressive");

            if (request.File.ContentType == "image/jpeg" && request.JpegReconstruction)
                args.Append(" --lossless_jpeg=1");

            if (request.ColorTransform != 0)
                args.Append($" --colortransform={request.ColorTransform}");

            return args.ToString();
        }
    }
}