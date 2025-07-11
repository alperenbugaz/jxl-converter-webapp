using jxl_converter.Server.Models;
using jxl_converter.Server.Services;
using Microsoft.AspNetCore.Mvc;

namespace jxl_converter.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CompressController : ControllerBase
    {
        private readonly ICompressService _compressService;

        public CompressController(ICompressService compressService)
        {
            _compressService = compressService;
        }

        [HttpPost]
        [RequestSizeLimit(250 * 1024 * 1024)]
        public async Task<IActionResult> Post([FromForm] CompressionRequest request)
        {
            if (request.File == null || request.File.Length == 0)
                return BadRequest(new { message = "No file uploaded." });

            var result = await _compressService.CompressImageAsync(request);

            if (!result.Success)
            {
                return StatusCode(500, new { message = result.ErrorMessage });
            }

            var originalSize = result.OriginalSize;
            var newSize = result.NewSize;

            return Ok(new
            {
                originalSize,
                newSize,
                reductionPercentage = originalSize > 0 ? ((originalSize - newSize) / (double)originalSize * 100).ToString("F1") : "0.0",
                downloadUrl = $"/api/download/{result.DownloadId}",
                newFileName = result.NewFileName
            });
        }
    }
}