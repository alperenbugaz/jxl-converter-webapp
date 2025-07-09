using jxl_converter.Server.Services;
using Microsoft.AspNetCore.Mvc;

namespace jxl_converter.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class DownloadController : ControllerBase
    {
        private readonly TempFileStorageService _storageService;

        public DownloadController(TempFileStorageService storageService)
        {
            _storageService = storageService;
        }

        [HttpGet("{id}")]
        public IActionResult GetFile(string id)
        {
            var filePath = _storageService.GetFilePath(id);

            if (string.IsNullOrEmpty(filePath))
            {
                return NotFound("File not found or link has expired.");
            }

            if (!System.IO.File.Exists(filePath))
            {
                return NotFound("File has been removed from the server.");
            }

            var memoryStream = new MemoryStream();
            using (var fileStream = new FileStream(filePath, FileMode.Open, FileAccess.Read, FileShare.Delete))
            {
                fileStream.CopyTo(memoryStream);
            }
            memoryStream.Position = 0;

            _storageService.RemoveFile(id);
            System.IO.File.Delete(filePath);

            return File(memoryStream, "image/jxl", Path.GetFileName(filePath));
        }
    }
}