import { OurFileRouter } from '@/app/api/uploadthing/core';
import {
  generateReactHelpers,
  generateUploadButton,
  generateUploadDropzone,
  generateUploader,
} from '@uploadthing/react';

export const UploadButton = generateUploadButton<OurFileRouter>();
export const UploadDropzone = generateUploadDropzone<OurFileRouter>();
export const UploadThingUploader = generateUploader<OurFileRouter>();
export const { uploadFiles, useUploadThing } = generateReactHelpers<OurFileRouter>();
