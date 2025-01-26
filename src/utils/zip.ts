import JSZip from 'jszip';
import { ImageFile, Attachment, ZipContent } from '../types';

export async function readZipFile(file: File): Promise<ZipContent> {
  const zip = new JSZip();
  const contents = await zip.loadAsync(file);
  
  const readme = contents.file('README.md');
  const readmeContent = readme ? await readme.async('text') : '';
  
  const images: ImageFile[] = [];
  const attachments: Attachment[] = [];
  
  // 处理所有文件
  for (const [path, zipEntry] of Object.entries(contents.files)) {
    if (!zipEntry.dir) {
      const blob = await zipEntry.async('blob');
      const fileName = path.split('/').pop() || '';
      
      // 根据文件类型分类
      if (/\.(jpg|jpeg|png|gif|webp)$/i.test(fileName)) {
        // 为图片创建 URL
        const url = URL.createObjectURL(blob);
        images.push({
          id: crypto.randomUUID(),
          name: fileName,
          url,
          file: new File([blob], fileName, { type: blob.type }),
          size: blob.size
        });
      } else if (path !== 'README.md') {
        // 为附件创建 File 对象
        attachments.push({
          name: fileName,
          file: new File([blob], fileName, { type: blob.type }),
          size: blob.size
        });
      }
    }
  }
  
  return {
    readme: readmeContent,
    images,
    attachments
  };
}

export async function createZipFile(markdown: string, images: ImageFile[], attachments: Attachment[]): Promise<Blob> {
  const zip = new JSZip();
  
  // 添加 README.md
  zip.file('README.md', markdown);
  
  // 添加图片
  const imagesFolder = zip.folder('images');
  if (imagesFolder) {
    for (const image of images) {
      const response = await fetch(image.url);
      const blob = await response.blob();
      imagesFolder.file(image.name, blob);
    }
  }
  
  // 添加附件
  const attachmentsFolder = zip.folder('attachments');
  if (attachmentsFolder) {
    for (const attachment of attachments) {
      attachmentsFolder.file(attachment.name, attachment.file);
    }
  }
  
  return zip.generateAsync({ type: 'blob' });
}
