import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './ImageCompressor.css';
import { UploadIcon, TurtleIcon, RabbitIcon, ArrowDownIcon, SettingsIcon, ChevronDownIcon } from './Icons';

function ImageCompressor() {
    const [step, setStep] = useState('upload');
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [error, setError] = useState(null);
    const [result, setResult] = useState(null);

    // --- Sıkıştırma Ayarları ---
    // DEĞİŞİKLİK: 'distance' state'ini 'quality' olarak yeniden adlandırdık ve aralığını güncelledik.
    const [quality, setQuality] = useState(90); // Varsayılan kalite %90 olsun
    const [effort, setEffort] = useState(7);
    const [lossless, setLossless] = useState(false);

    // --- Gelişmiş Ayarlar ---
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [progressive, setProgressive] = useState(true);
    const [jpegReconstruction, setJpegReconstruction] = useState(true);
    const [colorTransform, setColorTransform] = useState(0);

    const isJpg = selectedFile?.type === 'image/jpeg';

    const resetState = useCallback(() => {
        setStep('upload');
        setSelectedFile(null);
        setPreviewUrl(null);
        setResult(null);
        setError(null);
        setShowAdvanced(false);
        setLossless(false);
        setQuality(90); // State'i sıfırla
        setEffort(7);
        setProgressive(true);
        setJpegReconstruction(true);
        setColorTransform(0);
    }, []);

    const handleFileSelect = useCallback((file) => {
        if (file && file.type.startsWith('image/')) {
            setSelectedFile(file);
            setError(null);
            setStep('configuring');
        } else {
            setError('Please select a valid image file.');
        }
    }, []);

    const handleFileChange = (e) => handleFileSelect(e.target.files[0]);
    const handleDragOver = (e) => e.preventDefault();
    const handleDrop = (e) => {
        e.preventDefault();
        handleFileSelect(e.dataTransfer.files[0]);
    };

    const handleCompress = async () => {
        if (!selectedFile) return;
        setStep('processing');
        setError(null);
        setResult(null);

        const formData = new FormData();
        formData.append('File', selectedFile);
        // DEĞİŞİKLİK: Backend'e 'distance' yerine 'quality' gönderiyoruz.
        formData.append('Quality', quality);
        formData.append('Effort', effort);
        formData.append('Lossless', lossless);
        formData.append('Progressive', progressive);
        if (isJpg) {
            formData.append('JpegReconstruction', jpegReconstruction);
        }
        formData.append('ColorTransform', colorTransform);

        try {
            const response = await fetch('/api/compress', { method: 'POST', body: formData });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'An unknown server error occurred.');
            }
            const resultData = await response.json();
            setResult(resultData);
            setStep('result');
        } catch (err) {
            setError(err.message);
            setStep('configuring');
        }
    };

    useEffect(() => {
        if (!selectedFile) {
            setPreviewUrl(null);
            return;
        }
        const objectUrl = URL.createObjectURL(selectedFile);
        setPreviewUrl(objectUrl);
        return () => URL.revokeObjectURL(objectUrl);
    }, [selectedFile]);

    return (
        <motion.div
            className="card"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
        >
            {step === 'upload' && (
                <div className="upload-view" onDragOver={handleDragOver} onDrop={handleDrop}>
                    <div className="upload-icon-container"> <UploadIcon /> </div>
                    <h2>Drag & Drop Your Image Here</h2>
                    <p>or</p>
                    <label htmlFor="file-upload" className="upload-button">Choose a File</label>
                    <input type="file" id="file-upload" accept="image/*,.jxl" onChange={handleFileChange} />
                </div>
            )}

            {(step === 'configuring' || step === 'processing' || step === 'result') && (
                <div className="main-view">
                    <div className="preview-panel">
                        <img src={previewUrl} alt="Preview" />
                        {step === 'processing' && <div className="spinner-overlay"><div className="spinner"></div></div>}
                    </div>
                    <div className="settings-panel">
                        {step === 'configuring' && (
                            <>
                                <div className="file-info">
                                    <h4>{selectedFile?.name}</h4>
                                    <p>{(selectedFile?.size / 1024).toFixed(1)} KB</p>
                                </div>
                                
                                <div className="setting-group">
                                    <label>Compression Type</label>
                                    <div className="segmented-control">
                                        <button className={!lossless ? 'active' : ''} onClick={() => setLossless(false)}>Lossy</button>
                                        <button className={lossless ? 'active' : ''} onClick={() => setLossless(true)}>Lossless</button>
                                    </div>
                                </div>

                                <AnimatePresence>
                                {!lossless && (
                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}>
                                        <div className="setting-group">
                                            {/* DEĞİŞİKLİK: Quality kaydırıcısını güncelledik */}
                                            <div className="quality-label-container">
                                                <label htmlFor="quality">Quality</label>
                                                <span>{quality}%</span>
                                            </div>
                                            <div className="quality-slider-container">
                                                <input
                                                    type="range"
                                                    id="quality"
                                                    min="0"
                                                    max="100"
                                                    step="1"
                                                    value={quality}
                                                    onChange={(e) => setQuality(parseInt(e.target.value))}
                                                    className="quality-slider"
                                                    style={{ '--value': `${quality}%` }}
                                                />
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                                </AnimatePresence>

                                <div className="advanced-settings">
                                    <button className="advanced-toggle" onClick={() => setShowAdvanced(!showAdvanced)}>
                                        <SettingsIcon />
                                        <span>Advanced Settings</span>
                                        <ChevronDownIcon className={`chevron ${showAdvanced ? 'open' : ''}`} />
                                    </button>
                                    <AnimatePresence>
                                        {showAdvanced && (
                                            <motion.div className="advanced-options" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3, ease: 'easeInOut' }}>
                                                <div className="setting-group">
                                                    <div className="effort-label-container">
                                                        <label htmlFor="effort">Effort (1:Fast, 9:Best)</label>
                                                        <span>{effort}</span>
                                                    </div>
                                                    <div className="quality-slider-container">
                                                        <input type="range" id="effort" min="1" max="9" step="1" value={effort} onChange={(e) => setEffort(parseInt(e.target.value))} className="quality-slider" style={{ '--value': `${((effort - 1) / (9 - 1)) * 100}%` }}/>
                                                    </div>
                                                </div>
                                                <div className="setting-group-checkbox">
                                                    <input type="checkbox" id="progressive" checked={progressive} onChange={(e) => setProgressive(e.target.checked)} />
                                                    <label htmlFor="progressive">Progressive Rendering</label>
                                                </div>
                                                {isJpg && (
                                                    <div className="setting-group-checkbox">
                                                        <input type="checkbox" id="jpegReconstruction" checked={jpegReconstruction} onChange={(e) => setJpegReconstruction(e.target.checked)} />
                                                        <label htmlFor="jpegReconstruction">Lossless JPEG Reconstruction Data</label>
                                                    </div>
                                                )}
                                                <div className="setting-group">
                                                    <label htmlFor="colorTransform">Color Space Transform</label>
                                                    <select id="colorTransform" className="dropdown" value={colorTransform} onChange={(e) => setColorTransform(parseInt(e.target.value))}>
                                                        <option value="0">XYB (Best Quality)</option>
                                                        <option value="2">YCbCr (JPEG-like)</option>
                                                        <option value="1">None (for specific use cases)</option>
                                                    </select>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {error && <p className="error-text">{error}</p>}
                                <button className="action-button" onClick={handleCompress} disabled={step === 'processing'}>
                                    {step === 'processing' ? 'Processing...' : 'Compress'}
                                </button>
                                <button className="secondary-button" onClick={resetState} disabled={step === 'processing'}>Cancel</button>
                            </>
                        )}
                        {step === 'result' && result && (
                             <div className="result-view">
                                <h3>Success!</h3>
                                <p>Compression complete.</p>
                                <div className="result-summary">
                                    <div className="size-item">
                                        <span>ORIGINAL</span>
                                        <strong>{(result.originalSize / 1024).toFixed(1)} KB</strong>
                                    </div>
                                    <div className="arrow-icon"><ArrowDownIcon /></div>
                                    <div className="size-item new-size">
                                        <span>NEW SIZE</span>
                                        <strong>{(result.newSize / 1024).toFixed(1)} KB</strong>
                                    </div>
                                </div>
                                <div className="reduction-badge">
                                    {result.reductionPercentage}% Saved
                                </div>
                                <a href={result.downloadUrl} download={result.newFileName} className="action-button download-button">
                                    Download
                                </a>
                                <button className="secondary-button" onClick={resetState}>Compress Another File</button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </motion.div>
    );
}

export default ImageCompressor;