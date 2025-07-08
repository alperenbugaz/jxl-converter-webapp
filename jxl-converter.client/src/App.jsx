import React from 'react';
import Navbar from './components/Navbar';
import ImageCompressor from './components/ImageCompressor';
import './App.css'; 

function App() {
    return (
        <>
            <Navbar />
            <main className="main-content">
                <ImageCompressor />
            </main>
        </>
    );
}

export default App;