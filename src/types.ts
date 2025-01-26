export interface ImageFile {
  id: string;
  name: string;
  url: string;
  file: File;
  size: number;
}

export interface Attachment {
  name: string;
  file: File;
  size: number;
}

export interface ZipContent {
  readme: string;
  images: ImageFile[];
  attachments: Attachment[];
}
