using jxl_converter.Server.Models;

namespace jxl_converter.Server.Services
{
    public interface ICompressService
    {
        Task<CompressionResult> CompressImageAsync(CompressionRequest request);

    }
}
