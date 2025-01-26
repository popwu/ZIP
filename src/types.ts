export interface ImageFile {
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
