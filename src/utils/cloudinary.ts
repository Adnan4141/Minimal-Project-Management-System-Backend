import { v2 as cloudinary } from 'cloudinary'
import { config } from '../config/env'
import { Readable } from 'stream'
import streamifier from 'streamifier'

if (config.cloudinary.cloudName && config.cloudinary.apiKey && config.cloudinary.apiSecret) {
  cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret,
  })
} else {
  console.warn('Cloudinary credentials not configured. File uploads will fail.')
}

export interface UploadResult {
  public_id: string
  secure_url: string
  url: string
  format: string
  resource_type: string
  bytes: number
  width?: number
  height?: number
}

export async function uploadToCloudinary(
  buffer: Buffer,
  filename: string,
  folder?: string
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const uploadOptions: any = {
      folder: folder || config.cloudinary.folder,
      resource_type: 'auto',
      use_filename: true,
      unique_filename: true,
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          reject(error)
        } else if (result) {
          resolve({
            public_id: result.public_id,
            secure_url: result.secure_url,
            url: result.url,
            format: result.format || '',
            resource_type: result.resource_type || '',
            bytes: result.bytes,
            width: result.width,
            height: result.height,
          })
        } else {
          reject(new Error('Upload failed: No result returned'))
        }
      }
    )

    streamifier.createReadStream(buffer).pipe(uploadStream)
  })
}

export async function deleteFromCloudinary(publicId: string): Promise<void> {
  try {
    const result = await cloudinary.uploader.destroy(publicId)
    if (result.result !== 'ok' && result.result !== 'not found') {
      throw new Error(`Failed to delete from Cloudinary: ${result.result}`)
    }
  } catch (error) {
    throw new Error(`Cloudinary deletion error: ${error}`)
  }
}

export function extractPublicIdFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url)
    const pathParts = urlObj.pathname.split('/')
    
    const versionIndex = pathParts.findIndex(part => part === 'v1' || part === 'v2' || /^v\d+$/.test(part))
    if (versionIndex !== -1 && versionIndex < pathParts.length - 1) {
      const pathAfterVersion = pathParts.slice(versionIndex + 1).join('/')
      const publicId = pathAfterVersion.replace(/\.[^/.]+$/, '')
      return publicId
    }
    
    const folderIndex = pathParts.findIndex(part => part === config.cloudinary.folder)
    if (folderIndex !== -1 && folderIndex < pathParts.length - 1) {
      const pathAfterFolder = pathParts.slice(folderIndex).join('/')
      const publicId = pathAfterFolder.replace(/\.[^/.]+$/, '')
      return publicId
    }
    
    const lastPart = pathParts[pathParts.length - 1]
    if (lastPart) {
      return lastPart.replace(/\.[^/.]+$/, '')
    }
    
    return null
  } catch (error) {
    return null
  }
}

export default cloudinary

