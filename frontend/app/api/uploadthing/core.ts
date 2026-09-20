import { createUploadthing, type FileRouter } from 'uploadthing/next';

import { envTagMiddleware } from '@/lib/uploadthing-tag';

const f = createUploadthing();

// FileRouter for your app, can contain multiple FileRoutes
export const ourFileRouter = {
  // Define as many FileRoutes as you like, each with a unique routeSlug
  imageUploader: f(
    {
      image: {
        /**
         * For full list of options and defaults, see the File Route API reference
         * @see https://docs.uploadthing.com/file-routes#route-config
         */
        maxFileSize: '64MB',
        maxFileCount: 1,
      },
    },
    {
      awaitServerData: false,
    },
  )
    .middleware(envTagMiddleware)
    .onUploadComplete(() => {}),
  postImages: f(
    {
      image: {
        maxFileSize: '64MB',
        maxFileCount: 100,
      },
    },
    {
      awaitServerData: false,
    },
  )
    .middleware(envTagMiddleware)
    .onUploadComplete(() => {}),
  postVideos: f(
    {
      video: {
        maxFileSize: '1GB',
        maxFileCount: 5,
      },
    },
    {
      awaitServerData: false,
    },
  )
    .middleware(envTagMiddleware)
    .onUploadComplete(() => {}),
  attachmentUploader: f(
    {
      text: {
        maxFileSize: '16MB',
        maxFileCount: 10,
      },
      image: {
        maxFileSize: '64MB',
        maxFileCount: 10,
      },
      video: {
        maxFileSize: '2GB',
        maxFileCount: 5,
      },
      pdf: {
        maxFileSize: '256MB',
        maxFileCount: 5,
      },
      audio: {
        maxFileSize: '128MB',
        maxFileCount: 5,
      },
      'application/msword': {
        maxFileSize: '128MB',
        maxFileCount: 5,
      },
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        {
          maxFileSize: '128MB',
          maxFileCount: 5,
        },
      'application/vnd.ms-excel': {
        maxFileSize: '64MB',
        maxFileCount: 5,
      },
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
        maxFileSize: '64MB',
        maxFileCount: 5,
      },
      'application/vnd.ms-powerpoint': {
        maxFileSize: '256MB',
        maxFileCount: 5,
      },
      'application/vnd.openxmlformats-officedocument.presentationml.presentation':
        {
          maxFileSize: '256MB',
          maxFileCount: 5,
        },
    },
    {
      awaitServerData: false,
    },
  )
    .middleware(envTagMiddleware)
    .onUploadComplete(() => {}),
  videoUploader: f(
    {
      video: {
        maxFileSize: '2GB',
        maxFileCount: 1,
      },
    },
    {
      awaitServerData: false,
    },
  )
    .middleware(envTagMiddleware)
    .onUploadComplete(() => {}),
  returnEvidenceImages: f(
    {
      image: {
        maxFileSize: '16MB',
        maxFileCount: 5,
      },
    },
    {
      awaitServerData: false,
    },
  )
    .middleware(envTagMiddleware)
    .onUploadComplete(() => {}),
  returnEvidenceVideos: f(
    {
      video: {
        maxFileSize: '1GB',
        maxFileCount: 1,
      },
    },
    {
      awaitServerData: false,
    },
  )
    .middleware(envTagMiddleware)
    .onUploadComplete(() => {}),
  kycImages: f(
    {
      image: {
        maxFileSize: '64MB',
        maxFileCount: 5,
      },
    },
    {
      awaitServerData: false,
    },
  )
    .middleware(envTagMiddleware)
    .onUploadComplete(() => {}),
  legalDocs: f(
    {
      pdf: { maxFileSize: '64MB', maxFileCount: 10 },
      image: { maxFileSize: '64MB', maxFileCount: 10 },
      'application/zip': { maxFileSize: '64MB', maxFileCount: 10 },
    },
    { awaitServerData: false },
  )
    .middleware(envTagMiddleware)
    .onUploadComplete(() => {}),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
