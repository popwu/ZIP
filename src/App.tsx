import { useState, useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ImageEditor } from './components/ImageEditor';
import { readZipFile, createZipFile } from './utils/zip';
import { ImageFile, Attachment } from './types';

interface RenameInputProps {
  name: string;
  onRename: (newName: string) => void;
  onCancel: () => void;
}

function RenameInput({ name, onRename, onCancel }: RenameInputProps) {
  const [value, setValue] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedValue = value.trim();
    if (trimmedValue && trimmedValue !== name) {
      onRename(trimmedValue);
    } else {
      onCancel();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  // 自动聚焦输入框
  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  return (
    <form onSubmit={handleSubmit} className="flex">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={onCancel}
        className="flex-1 px-1 py-0.5 text-sm border border-blue-500 rounded"
      />
    </form>
  );
}

function formatFileSize(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function App() {
  const [markdown, setMarkdown] = useState('');
  const [images, setImages] = useState<ImageFile[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [editingImage, setEditingImage] = useState<ImageFile | null>(null);
  const [editingName, setEditingName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newImages = await Promise.all(
        Array.from(files).map(async (file) => {
          const url = URL.createObjectURL(file);
          return {
            id: crypto.randomUUID(),
            name: file.name,
            url,
            file,
            size: file.size
          };
        })
      );
      setImages([...images, ...newImages]);
    }
    event.target.value = '';
  };

  const handleAttachmentUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newAttachments = Array.from(files).map((file) => ({
        id: crypto.randomUUID(),
        name: file.name,
        file,
        size: file.size
      }));
      setAttachments([...attachments, ...newAttachments]);
    }
    event.target.value = '';
  };

  const handleZipUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const content = await readZipFile(file);
        setMarkdown(content.readme);
        setImages(content.images);
        setAttachments(content.attachments);
      } catch (error) {
        console.error('Error reading ZIP file:', error);
      }
    }
    event.target.value = '';
  };

  const handleExportZip = async () => {
    try {
      const zipBlob = await createZipFile(markdown, images, attachments);
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'markdown-export.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error creating ZIP file:', error);
    }
  };

  const handleImageEdit = (image: ImageFile) => {
    setEditingImage(image);
  };

  const handleImageSave = (editedImage: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      setImages((prev) =>
        prev.map((img) =>
          img.id === editingImage?.id
            ? {
                ...img,
                file: editedImage,
                url,
              }
            : img
        )
      );
    };
    reader.readAsDataURL(editedImage);
    setEditingImage(null);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4">
          <h1 className="text-3xl font-bold text-gray-900">ZIP Markdown 编辑器</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex space-x-4">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              添加图片
            </button>
            <button
              onClick={() => attachmentInputRef.current?.click()}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              添加附件
            </button>
            <button
              onClick={() => zipInputRef.current?.click()}
              className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
            >
              打开 ZIP
            </button>
            <button
              onClick={handleExportZip}
              className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
            >
              导出 ZIP
            </button>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            className="hidden"
            multiple
          />
          <input
            type="file"
            ref={attachmentInputRef}
            onChange={handleAttachmentUpload}
            className="hidden"
            multiple
          />
          <input
            type="file"
            ref={zipInputRef}
            onChange={handleZipUpload}
            accept=".zip"
            className="hidden"
          />

          {images.length > 0 && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold mb-2">图片列表</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
                {images.map((image, index) => (
                  <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden">
                    <div className="relative">
                      <img
                        src={image.url}
                        alt={image.name}
                        className="w-full h-40 object-cover"
                      />
                    </div>
                    <div className="p-2 space-y-2">
                      <div 
                        className="text-sm text-gray-700 truncate cursor-pointer hover:text-blue-500" 
                        title="点击重命名"
                        onClick={() => setEditingName(image.name)}
                      >
                        {editingName === image.name ? (
                          <RenameInput
                            name={image.name}
                            onRename={(newName) => {
                              setImages(images.map(img => 
                                img === image 
                                  ? { ...img, name: newName }
                                  : img
                              ));
                              setEditingName(null);
                            }}
                            onCancel={() => setEditingName(null)}
                          />
                        ) : (
                          image.name
                        )}
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">{formatFileSize(image.size)}</span>
                        <div className="space-x-2">
                          <button
                            onClick={() => handleImageEdit(image)}
                            className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                          >
                            编辑
                          </button>
                          <button
                            onClick={() => {
                              const markdown = `![${image.name}](images/${image.name})`;
                              navigator.clipboard.writeText(markdown);
                            }}
                            className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                          >
                            复制 Markdown
                          </button>
                          <button
                            onClick={() => {
                              setImages(images.filter(img => img !== image));
                            }}
                            className="text-xs px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                          >
                            删除
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {attachments.length > 0 && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold mb-2">附件列表</h3>
              <div className="space-y-2">
                {attachments.map((attachment, index) => (
                  <div key={index} className="flex items-center justify-between bg-white p-3 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center space-x-3">
                      <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                      <div 
                        className="text-gray-700 cursor-pointer hover:text-blue-500"
                        title="点击重命名"
                        onClick={() => setEditingName(attachment.name)}
                      >
                        {editingName === attachment.name ? (
                          <RenameInput
                            name={attachment.name}
                            onRename={(newName) => {
                              setAttachments(attachments.map(att => 
                                att === attachment 
                                  ? { ...att, name: newName }
                                  : att
                              ));
                              setEditingName(null);
                            }}
                            onCancel={() => setEditingName(null)}
                          />
                        ) : (
                          attachment.name
                        )}
                      </div>
                      <span className="text-gray-500 text-sm">({formatFileSize(attachment.size)})</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          const markdown = `[${attachment.name}](attachments/${attachment.name})`;
                          navigator.clipboard.writeText(markdown);
                        }}
                        className="text-white bg-blue-500 hover:bg-blue-600 px-2 py-1 rounded text-sm flex items-center"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                        </svg>
                        复制 Markdown
                      </button>
                      <button
                        onClick={() => {
                          const url = URL.createObjectURL(attachment.file);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = attachment.name;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          URL.revokeObjectURL(url);
                        }}
                        className="text-white bg-blue-500 hover:bg-blue-600 px-2 py-1 rounded text-sm flex items-center justify-center"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        下载
                      </button>
                      <button
                        onClick={() => {
                          setAttachments(attachments.filter(a => a !== attachment));
                        }}
                        className="text-white bg-red-500 hover:bg-red-600 p-1 rounded"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-4 h-[calc(100vh-400px)]">
          <div className="flex-1 bg-white shadow rounded-lg">
            <Editor
              height="100%"
              defaultLanguage="markdown"
              value={markdown}
              onChange={(value) => setMarkdown(value || '')}
              theme="light"
              options={{
                minimap: { enabled: false },
                wordWrap: 'on',
              }}
            />
          </div>

          <div className="flex-1 bg-white shadow rounded-lg p-4 overflow-auto prose prose-slate max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                img: ({ node, src, alt, ...props }) => {
                  // 解码 URL 并移除可能的转义字符
                  const decodedSrc = decodeURIComponent(src?.replace(/[!\\]/g, '') || '');
                  
                  // 尝试多种可能的路径格式
                  const image = images.find(img => {
                    const imgName = img.name;
                    const imgPath = `images/${imgName}`;
                    
                    // 清理和标准化路径以进行比较
                    const cleanedSrc = decodedSrc.replace(/^[![(]|[)\]]/g, '').trim();
                    const cleanedImgName = imgName.replace(/^[![(]|[)\]]/g, '').trim();
                    
                    return cleanedSrc === imgPath || 
                           cleanedSrc === imgName ||
                           cleanedSrc.endsWith(imgPath) || 
                           cleanedSrc.endsWith(imgName) ||
                           cleanedSrc === cleanedImgName;
                  });
                  
                  if (image) {
                    return (
                      <img
                        src={image.url}
                        alt={alt || image.name}
                        className="max-w-full h-auto my-4 rounded-lg shadow-md"
                        {...props}
                      />
                    );
                  }
                  
                  return (
                    <div className="bg-red-50 text-red-500 p-4 rounded-lg my-4 flex items-center">
                      <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      图片未找到: {decodedSrc}
                    </div>
                  );
                },
                a: ({ node, href, children, ...props }) => {
                  const decodedHref = decodeURIComponent(href || '');
                  const attachment = attachments.find(attach => {
                    const attachPath = `attachments/${attach.name}`;
                    return decodedHref === attachPath || decodedHref.endsWith(attachPath);
                  });
                  
                  if (attachment) {
                    return (
                      <button
                        onClick={() => {
                          const url = URL.createObjectURL(attachment.file);
                          const link = document.createElement('a');
                          link.href = url;
                          link.download = attachment.name;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                          setTimeout(() => URL.revokeObjectURL(url), 1000);
                        }}
                        className="text-blue-500 hover:text-blue-600 inline-flex items-center"
                        type="button"
                      >
                        <svg
                          className="w-4 h-4 mr-1"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                          />
                        </svg>
                        {children}
                        <span className="text-gray-500 text-sm ml-2">
                          ({formatFileSize(attachment.size)})
                        </span>
                      </button>
                    );
                  }
                  
                  return (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:text-blue-600"
                      {...props}
                    >
                      {children}
                    </a>
                  );
                },
                h1: ({ node, ...props }) => (
                  <h1 className="text-4xl font-bold mb-4 mt-6" {...props} />
                ),
                h2: ({ node, ...props }) => (
                  <h2 className="text-3xl font-bold mb-3 mt-5" {...props} />
                ),
                h3: ({ node, ...props }) => (
                  <h3 className="text-2xl font-bold mb-3 mt-4" {...props} />
                ),
                h4: ({ node, ...props }) => (
                  <h4 className="text-xl font-bold mb-2 mt-4" {...props} />
                ),
                h5: ({ node, ...props }) => (
                  <h5 className="text-lg font-bold mb-2 mt-3" {...props} />
                ),
                h6: ({ node, ...props }) => (
                  <h6 className="text-base font-bold mb-2 mt-3" {...props} />
                ),
                p: ({ node, ...props }) => (
                  <p className="mb-4" {...props} />
                ),
                ul: ({ node, ...props }) => (
                  <ul className="list-disc pl-6 mb-4" {...props} />
                ),
                ol: ({ node, ...props }) => (
                  <ol className="list-decimal pl-6 mb-4" {...props} />
                ),
                li: ({ node, ...props }) => (
                  <li className="mb-1" {...props} />
                ),
                blockquote: ({ node, ...props }) => (
                  <blockquote className="border-l-4 border-gray-300 pl-4 italic my-4" {...props} />
                ),
                code: ({ inline, ...props }: { inline?: boolean } & React.HTMLProps<HTMLElement>) => (
                  inline ? (
                    <code className="bg-gray-100 rounded px-1" {...props} />
                  ) : (
                    <code className="block bg-gray-100 rounded p-4 mb-4 overflow-x-auto" {...props} />
                  )
                ),
                pre: ({ node, ...props }) => (
                  <pre className="mb-4" {...props} />
                ),
                hr: ({ node, ...props }) => (
                  <hr className="my-8 border-t border-gray-300" {...props} />
                ),
                table: ({ node, ...props }) => (
                  <div className="overflow-x-auto mb-4">
                    <table className="min-w-full divide-y divide-gray-300" {...props} />
                  </div>
                ),
                th: ({ node, ...props }) => (
                  <th className="px-4 py-2 bg-gray-50 font-semibold text-left" {...props} />
                ),
                td: ({ node, ...props }) => (
                  <td className="px-4 py-2 border-t" {...props} />
                )
              }}
            >
              {markdown}
            </ReactMarkdown>
          </div>
        </div>
      </main>

      {editingImage && (
        <ImageEditor
          image={editingImage}
          onSave={handleImageSave}
          onCancel={() => setEditingImage(null)}
        />
      )}
    </div>
  );
}

export default App;
