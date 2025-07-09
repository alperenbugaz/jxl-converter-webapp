using System.Collections.Concurrent;

namespace jxl_converter.Server.Services
{

    public class TempFileStorageService
    {
        private readonly ConcurrentDictionary<string, string> _storage = new();

        public void AddFile(string id, string path)
        {
            _storage[id] = path;
        }

        public string? GetFilePath(string id)
        {
            _storage.TryGetValue(id, out var path);
            return path;
        }

        public void RemoveFile(string id)
        {
            _storage.TryRemove(id, out _);
        }
    }
}