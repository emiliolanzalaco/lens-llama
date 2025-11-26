import { z } from 'zod';

/**
 * Shared validation schemas for upload endpoints
 */

export const baseUploadFields = {
  title: z.string().min(1, 'Title is required'),
  description: z.string().nullable(),
  tags: z.string().transform((val) =>
    val ? val.split(',').map((t) => t.trim()).filter(Boolean) : []
  ),
  price: z.string().transform((val, ctx) => {
    const num = parseFloat(val);
    if (isNaN(num) || num <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Price must be greater than zero',
      });
      return z.NEVER;
    }
    return num;
  }),
  photographerAddress: z.string().regex(
    /^0x[a-fA-F0-9]{40}$/,
    'Invalid Ethereum address'
  ),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
};

export const metadataSchema = z.object({
  type: z.enum(['original', 'watermarked']),
  ...baseUploadFields,
});

export const completeUploadSchema = z.object({
  originalUrl: z.string().url(),
  watermarkedUrl: z.string().url(),
  ...baseUploadFields,
});
