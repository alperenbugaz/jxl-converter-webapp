// src/components/ImageCompressor.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion'; // HATA BURADAYDI: Bu satýr eksikti.
import './ImageCompressor.css';
import { UploadIcon, TurtleIcon, RabbitIcon, ArrowDownIcon } from './Icons';

const effortOptions = [
    { name: 'Fast (Lower Quality)', value: 4, icon: <RabbitIcon /> },
    { name: 'Balanced', value: 7, icon: null },
    { name: 'High Quality (Slow)', value: 9, icon: <TurtleIcon /> },
];

function ImageCompressor() {
    const [step, setStep] = useState('upload'); // 'upload', 'configuring', 'processing', 'result'
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);

    // Ayarlar için state'ler
    const [distance, setDistance] = useState(1.0);
    const [effort, setEffort] = useState(7);
    const [lossless, setLossless] = useState(false);

    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    const resetState = useCallback(() => {
        setStep('upload');
        setSelectedFile(null);
        setPreviewUrl(null);
        setResult(null);
        setError(null);
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
        formData.append('file', selectedFile);
        formData.append('distance', lossless ? 0 : distance);
        formData.append('effort', effort);
        formData.append('lossless', lossless);

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
                    <input type="file" id="file-upload" accept="image/*" onChange={handleFileChange} />
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
                                {!lossless && (
                                    <div className="setting-group">
                                        <label htmlFor="distance">Quality Level</label>
                                        <input type="range" id="distance" min="0.1" max="3.0" step="0.1" value={distance} onChange={(e) => setDistance(parseFloat(e.target.value))} />
                                    </div>
                                )}
                                <div className="setting-group">
                                    <label>Effort (Speed vs. Quality)</label>
                                    <div className="segmented-control effort-control">
                                        {effortOptions.map(opt => (
                                            <button key={opt.value} className={effort === opt.value ? 'active' : ''} onClick={() => setEffort(opt.value)} title={opt.name}>
                                                {opt.icon || opt.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                {error && <p className="error-text">{error}</p>}
                                <button className="action-button" onClick={handleCompress}>Compress</button>
                                <button className="secondary-button" onClick={resetState}>Cancel</button>
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
