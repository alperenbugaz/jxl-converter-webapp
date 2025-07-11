namespace jxl_converter.Server.Models
{
    public class CompressionResult
    {
        public bool Success { get; set; }
        public string ErrorMessage { get; set; }
        public long OriginalSize { get; set; }
        public long NewSize { get; set; }
        public string DownloadId { get; set; }
        public string NewFileName { get; set; }
    }
}
