import React from "react";
import { FaXmark, FaDownload, FaShare } from "react-icons/fa6";

const ImageViewer = ({ image, onClose }) => {
  if (!image) return null;

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = image;
    link.download = `blinkupz-image-${Date.now()}.jpg`;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "BlinkUpZ Image",
          url: image,
        });
      } catch (err) {
        console.log("Share cancelled");
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(image);
      alert("Image URL copied to clipboard!");
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex items-center justify-center"
      onClick={onClose}
    >
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-3 bg-slate-800/80 hover:bg-slate-700 rounded-full text-white transition-all duration-200 hover:scale-110 z-10"
      >
        <FaXmark className="w-6 h-6" />
      </button>

      {/* Top Actions */}
      <div className="absolute top-4 left-4 flex gap-3 z-10">
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 rounded-full text-white font-medium transition-all duration-200 hover:scale-105"
        >
          <FaDownload className="w-4 h-4" />
          <span className="hidden sm:inline">Download</span>
        </button>
        <button
          onClick={handleShare}
          className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-full text-white font-medium transition-all duration-200 hover:scale-105"
        >
          <FaShare className="w-4 h-4" />
          <span className="hidden sm:inline">Share</span>
        </button>
      </div>

      {/* Image Container */}
      <div 
        className="relative max-w-[95vw] max-h-[90vh] flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={image}
          alt="Full screen view"
          className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
          onError={(e) => {
            e.target.src = "/default-avatar.svg";
          }}
        />
      </div>

      {/* Bottom Info */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-slate-400 text-sm">
        Click outside or press ESC to close
      </div>
    </div>
  );
};

export default ImageViewer;