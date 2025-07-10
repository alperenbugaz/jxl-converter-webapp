import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './ImageCompressor.css';
import { UploadIcon, ArrowDownIcon, SettingsIcon, ChevronDownIcon } from './Icons';

function ImageCompressor() {
    const [step, setStep] = useState('upload');
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [error, setError] = useState(null);
    const [result, setResult] = useState(null);
    const [isPreviewLoading, setIsPreviewLoading] = useState(false);
    const [previewProgress, setPreviewProgress] = useState(0);
    const [uploadProgress, setUploadProgress] = useState(0);

    const [quality, setQuality] = useState(90);
    const [effort, setEffort] = useState(7);
    const [lossless, setLossless] = useState(false);

    const [showAdvanced, setShowAdvanced] = useState(false);
    const [progressive, setProgressive] = useState(true);
    const [jpegReconstruction, setJpegReconstruction] = useState(true);

    const isJpg = selectedFile?.type === 'image/jpeg';

    const resetState = useCallback(() => {
        setStep('upload');
        setSelectedFile(null);
        setPreviewUrl(null);
        setResult(null);
        setError(null);
        setShowAdvanced(false);
        setLossless(false);
        setQuality(90);
        setEffort(7);
        setProgressive(true);
        setJpegReconstruction(true);
        setIsPreviewLoading(false);
        setPreviewProgress(0);
        setUploadProgress(0);
    }, []);

    const handleFileSelect = useCallback((file) => {
        if (!file || !file.type.startsWith('image/')) {
            setError('Please select a valid image file.');
            return;
        }

        setSelectedFile(file);
        setError(null);
        setStep('configuring');
        setIsPreviewLoading(true);
        setPreviewProgress(0);
        setPreviewUrl(null);

        const isJpegFile = file.type === 'image/jpeg';
        if (isJpegFile) {
            setLossless(true);
            setJpegReconstruction(true);
        } else {
            setLossless(false);
        }

        const downscaleAndSetPreview = async (arrayBuffer) => {
            try {
                const blob = new Blob([arrayBuffer], { type: file.type });
                const imageBitmap = await createImageBitmap(blob);

                let { width, height } = imageBitmap;
                const maxDimension = 800;

                if (width > maxDimension || height > maxDimension) {
                    if (width > height) {
                        height = Math.round((height * maxDimension) / width);
                        width = maxDimension;
                    } else {
                        width = Math.round((width * maxDimension) / height);
                        height = maxDimension;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(imageBitmap, 0, 0, width, height);
                imageBitmap.close();

                const resizedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
                setPreviewUrl(resizedDataUrl);
            } catch (e) {
                setError('Could not process the image for preview.');
            } finally {
                setIsPreviewLoading(false);
            }
        };

        const reader = new FileReader();

        reader.onprogress = (event) => {
            if (event.lengthComputable) {
                const percent = Math.round((event.loaded / event.total) * 100);
                setPreviewProgress(percent);
            }
        };

        reader.onload = () => {
            downscaleAndSetPreview(reader.result);
        };

        reader.onerror = () => {
            setError('Could not read the file for preview.');
            setIsPreviewLoading(false);
        };

        reader.readAsArrayBuffer(file);
    }, []);

    const handleFileChange = (e) => handleFileSelect(e.target.files[0]);
    const handleDragOver = (e) => e.preventDefault();
    const handleDrop = (e) => {
        e.preventDefault();
        handleFileSelect(e.dataTransfer.files[0]);
    };

    const handleCompress = () => {
        if (!selectedFile) return;

        setStep('processing');
        setError(null);
        setResult(null);
        setUploadProgress(0);

        const formData = new FormData();
        formData.append('File', selectedFile);
        formData.append('Quality', quality);
        formData.append('Effort', effort);
        formData.append('Lossless', lossless);
        formData.append('Progressive', progressive);
        if (isJpg && lossless) {
            formData.append('JpegReconstruction', jpegReconstruction);
        }

        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
                const percentComplete = Math.round((event.loaded / event.total) * 100);
                setUploadProgress(percentComplete);
            }
        });

        xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                const resultData = JSON.parse(xhr.responseText);
                setResult(resultData);
                setStep('result');
            } else {
                try {
                    const errorData = JSON.parse(xhr.responseText);
                    setError(errorData.message || 'An unknown server error occurred.');
                } catch (e) {
                    setError(`Server error: ${xhr.status}`);
                }
                setStep('configuring');
            }
        });

        xhr.addEventListener('error', () => {
            setError('Upload failed. Check your network connection.');
            setStep('configuring');
        });

        xhr.open('POST', '/api/compress', true);
        xhr.send(formData);
    };

    const renderSpinner = (text) => (
        <div className="spinner-overlay">
            <div className="spinner-container">
                <div className="spinner"></div>
                <span>{text}</span>
            </div>
        </div>
    );

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
                        {isPreviewLoading && renderSpinner(previewProgress > 0 ? `Loading Preview: ${previewProgress}%` : 'Loading Preview...')}
                        {!isPreviewLoading && previewUrl && <img src={previewUrl} alt="Preview" />}
                        {step === 'processing' && renderSpinner(uploadProgress < 100 ? `Uploading: ${uploadProgress}%` : 'Processing...')}
                    </div>

                    <div className="settings-panel">
                        {step === 'configuring' && (
                            <>
                                <div className="file-info">
                                    <h4>{selectedFile?.name}</h4>
                                    <p>{(selectedFile?.size / 1024 / 1024).toFixed(2)} MB</p>
                                </div>
                                <div className="setting-group">
                                    <label>Compression Type</label>
                                    <div className="segmented-control">
                                        <button className={!lossless ? 'active' : ''} onClick={() => setLossless(false)} disabled={isJpg} style={{ cursor: isJpg ? 'not-allowed' : 'pointer', opacity: isJpg ? 0.6 : 1 }}>Lossy</button>
                                        <button className={lossless ? 'active' : ''} onClick={() => setLossless(true)} disabled={isJpg} style={{ cursor: isJpg ? 'not-allowed' : 'pointer', opacity: isJpg ? 0.6 : 1 }}>Lossless</button>
                                    </div>
                                    {isJpg && <p style={{ fontSize: '0.8rem', color: '#b0b0b0', marginTop: '8px', textAlign: 'center' }}>JPEG files are automatically processed in Lossless mode.</p>}
                                </div>
                                <AnimatePresence>
                                    {!lossless && (
                                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}>
                                            <div className="setting-group">
                                                <div className="quality-label-container">
                                                    <label htmlFor="quality">Quality</label>
                                                    <span>{quality}%</span>
                                                </div>
                                                <div className="quality-slider-container">
                                                    <input type="range" id="quality" min="0" max="100" step="1" value={quality} onChange={(e) => setQuality(parseInt(e.target.value))} className="quality-slider" style={{ '--value': `${quality}%` }} />
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
                                                        <input type="range" id="effort" min="1" max="9" step="1" value={effort} onChange={(e) => setEffort(parseInt(e.target.value))} className="quality-slider" style={{ '--value': `${((effort - 1) / (9 - 1)) * 100}%` }} />
                                                    </div>
                                                </div>
                                                <div className="setting-group-checkbox">
                                                    <input type="checkbox" id="progressive" checked={progressive} onChange={(e) => setProgressive(e.target.checked)} />
                                                    <label htmlFor="progressive">Progressive Rendering</label>
                                                </div>
                                                {isJpg && (
                                                    <div className="setting-group-checkbox">
                                                        <input type="checkbox" id="jpegReconstruction" checked={true} disabled={true} />
                                                        <label htmlFor="jpegReconstruction" style={{ opacity: 0.7 }}>Lossless JPEG Reconstruction Data</label>
                                                    </div>
                                                )}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                                {error && <p className="error-text">{error}</p>}
                                <button className="action-button" onClick={handleCompress} disabled={step === 'processing' || isPreviewLoading}>{isPreviewLoading ? 'Loading Preview...' : 'Compress'}</button>
                                <button className="secondary-button" onClick={resetState} disabled={step === 'processing' || isPreviewLoading}>Cancel</button>
                            </>
                        )}
                        {step === 'result' && result && (
                            <div className="result-view">
                                <h3>Success!</h3>
                                <p>Compression complete.</p>
                                <div className="result-summary">
                                    <div className="size-item">
                                        <span>ORIGINAL</span>
                                        <strong>{(result.originalSize / 1024 / 1024).toFixed(2)} MB</strong>
                                    </div>
                                    <div className="arrow-icon"><ArrowDownIcon /></div>
                                    <div className="size-item new-size">
                                        <span>NEW SIZE</span>
                                        <strong>{(result.newSize / 1024 / 1024).toFixed(2)} MB</strong>
                                    </div>
                                </div>
                                <div className="reduction-badge">{result.reductionPercentage}% Saved</div>
                                <a href={result.downloadUrl} download={result.newFileName} className="action-button download-button">Download</a>
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