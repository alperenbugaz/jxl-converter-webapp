using Microsoft.AspNetCore.Mvc;

namespace jxl_converter.Server.Models
{

    public class CompressionRequest
    {
        [FromForm]
        public required IFormFile File { get; set; }

        [FromForm(Name = "Quality")]
        public int Quality { get; set; } = 90;

        [FromForm(Name = "Effort")]
        public int Effort { get; set; } = 7;

        [FromForm(Name = "Lossless")]
        public bool Lossless { get; set; }

        [FromForm(Name = "Progressive")]
        public bool Progressive { get; set; }

        [FromForm(Name = "JpegReconstruction")]
        public bool JpegReconstruction { get; set; }

        [FromForm(Name = "ColorTransform")]
        public int ColorTransform { get; set; }
    }
}