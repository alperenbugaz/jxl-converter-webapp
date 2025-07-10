import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './ImageCompressor.css';
import { UploadIcon, ArrowDownIcon, SettingsIcon, ChevronDownIcon } from './Icons';


const FullScreenLoader = ({ text, progress }) => (
    <motion.div
        className="full-screen-loader-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
    >
        <div className="spinner-content">
            <div className="spinner"></div>
            <span>{text}</span>
            {progress !== null && (
                <div className="progress-bar">
                    <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
                </div>
            )}
        </div>
    </motion.div>
);

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

        if (file.type === 'image/jpeg') {
            setLossless(true);
        } else {
            setLossless(false);
        }

        const reader = new FileReader();
        reader.onprogress = (event) => {
            if (event.lengthComputable) {
                setPreviewProgress(Math.round((event.loaded / event.total) * 100));
            }
        };
        reader.onload = (e) => {
            setPreviewUrl(e.target.result);
            setIsPreviewLoading(false);
        };
        reader.onerror = () => {
            setError('Could not read the file for preview.');
            setIsPreviewLoading(false);
        };
        reader.readAsDataURL(file);
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
            formData.append('JpegReconstruction', true);
        }

        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
                setUploadProgress(Math.round((event.loaded / event.total) * 100));
            }
        });
        xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                setResult(JSON.parse(xhr.responseText));
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

    return (
        <motion.div
            className={`card ${step !== 'upload' ? 'is-active' : ''}`}
            layout
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
        >
            <AnimatePresence>
                {(isPreviewLoading || step === 'processing') && (
                    <FullScreenLoader
                        text={
                            isPreviewLoading
                                ? `Loading Preview: ${previewProgress}%`
                                : (uploadProgress < 100 ? `Uploading: ${uploadProgress}%` : 'Compressing Image...')
                        }
                        progress={
                            isPreviewLoading
                                ? previewProgress
                                : uploadProgress
                        }
                    />
                )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
                {step === 'upload' ? (
                    <motion.div
                        key="upload-view"
                        className="upload-wrapper"
                        exit={{ opacity: 0 }}
                    >
                        <div className="upload-view" onDragOver={handleDragOver} onDrop={handleDrop}>
                            <div className="upload-icon-container"> <UploadIcon /> </div>
                            <h2>Drag & Drop Your Image Here</h2>
                            <p>or</p>
                            <label htmlFor="file-upload" className="upload-button">Choose a File</label>
                            <input type="file" id="file-upload" accept="image/*" onChange={handleFileChange} />
                        </div>
                    </motion.div>

                ) : (
                    <motion.div key="main-view" className="main-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <div className="preview-panel">
                            {!isPreviewLoading && previewUrl && (
                                <motion.img
                                    src={previewUrl}
                                    alt="Preview"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                />
                            )}
                        </div>

                        <div className="settings-panel">
                            <AnimatePresence mode="wait">
                                {step === 'configuring' && (
                                    <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                        <div className="file-info"><h4>{selectedFile?.name}</h4><p>{(selectedFile?.size / 1024 / 1024).toFixed(2)} MB</p></div>
                                        <div className="setting-group">
                                            <label>Compression Type</label>
                                            <div className="segmented-control"><button className={!lossless ? 'active' : ''} onClick={() => setLossless(false)} disabled={isJpg}>Lossy</button><button className={lossless ? 'active' : ''} onClick={() => setLossless(true)}>Lossless</button></div>
                                            {isJpg && <p className="info-text">JPEG files are auto-processed in Lossless mode.</p>}
                                        </div>
                                        <AnimatePresence>
                                            {!lossless && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}><div className="setting-group"><div className="quality-label-container"><label htmlFor="quality">Quality</label><span>{quality}</span></div><input type="range" id="quality" min="0" max="100" value={quality} onChange={(e) => setQuality(parseInt(e.target.value))} className="quality-slider" style={{ '--value': `${quality}%` }} /></div></motion.div>}
                                        </AnimatePresence>
                                        <div className="advanced-settings"><button className="advanced-toggle" onClick={() => setShowAdvanced(!showAdvanced)}><SettingsIcon /><span>Advanced Settings</span><ChevronDownIcon className={`chevron ${showAdvanced ? 'open' : ''}`} /></button>
                                            <AnimatePresence>{showAdvanced && <motion.div className="advanced-options" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                                                <div className="setting-group">
                                                    <div className="effort-label-container"><label htmlFor="effort">Effort (1:Fast, 9:Best)</label><span>{effort}</span></div>
                                                    <input type="range" id="effort" min="1" max="9" step="1" value={effort} onChange={(e) => setEffort(parseInt(e.target.value))} className="quality-slider" style={{ '--value': `${((effort - 1) / 8) * 100}%` }} />
                                                </div>
                                                <div className="setting-group-checkbox"><input type="checkbox" id="progressive" checked={progressive} onChange={(e) => setProgressive(e.target.checked)} /><label htmlFor="progressive">Progressive Rendering</label></div>
                                            </motion.div>}
                                            </AnimatePresence>
                                        </div>
                                        {error && <p className="error-text">{error}</p>}
                                        <div className="action-buttons">
                                            <button className="action-button" onClick={handleCompress} disabled={isPreviewLoading}>{isPreviewLoading ? 'Loading...' : 'Compress'}</button>
                                            <button className="secondary-button" onClick={resetState} disabled={isPreviewLoading}>Cancel</button>
                                        </div>
                                    </motion.div>
                                )}
                                {step === 'result' && result && (
                                    <motion.div key="result" className="result-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                        <h3>Success!</h3><p>Your image is compressed.</p>
                                        <div className="result-summary">
                                            <div className="size-item"><span>ORIGINAL</span><strong>{(result.originalSize / 1024 / 1024).toFixed(2)} MB</strong></div>
                                            <div className="arrow-icon"><ArrowDownIcon /></div>
                                            <div className="size-item new-size"><span>NEW SIZE</span><strong>{(result.newSize / 1024 / 1024).toFixed(2)} MB</strong></div>
                                        </div>
                                        <div className="reduction-badge">{result.reductionPercentage}% Saved</div>
                                        <a href={result.downloadUrl} download={result.newFileName} className="action-button download-button">Download</a>
                                        <button className="secondary-button" onClick={resetState}>Compress Another File</button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

export default ImageCompressor;