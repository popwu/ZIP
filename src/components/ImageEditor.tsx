import React, { useState } from 'react';
import { ImageFile } from '../types';

interface ImageEditorProps {
  image: ImageFile;
  onSave: (editedImage: File) => void;
  onCancel: () => void;
}

export function ImageEditor({ image, onSave, onCancel }: ImageEditorProps) {
  const [scale, setScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartPos({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - startPos.x,
        y: e.clientY - startPos.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleSave = async () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.src = image.url;
    await new Promise((resolve) => (img.onload = resolve));

    canvas.width = img.width;
    canvas.height = img.height;

    if (ctx) {
      ctx.scale(scale, scale);
      ctx.drawImage(
        img,
        position.x / scale,
        position.y / scale,
        img.width,
        img.height
      );

      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], image.name, {
            type: 'image/png'
          });
          onSave(file);
        }
      }, 'image/png');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white p-4 rounded-lg shadow-lg">
        <div
          className="relative overflow-hidden w-[500px] h-[500px]"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <img
            src={image.url}
            alt={image.name}
            className="absolute"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              cursor: isDragging ? 'grabbing' : 'grab'
            }}
          />
        </div>
        <div className="mt-4 flex items-center justify-between">
          <div>
            <label className="mr-2">缩放:</label>
            <input
              type="range"
              min="0.1"
              max="2"
              step="0.1"
              value={scale}
              onChange={(e) => setScale(parseFloat(e.target.value))}
              className="w-32"
            />
          </div>
          <div>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-500 text-white rounded mr-2 hover:bg-blue-600"
            >
              保存
            </button>
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              取消
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
