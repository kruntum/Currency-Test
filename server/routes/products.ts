import { Hono } from 'hono';
import { prisma } from '../db';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { AppEnv } from '../types';

const productSchema = z.object({
  name: z.string().min(1, 'ระบุชื่อสินค้า'),
});

const products = new Hono<AppEnv>();

// Get all products (that are not deleted)
products.get('/', async (c) => {
  const session = c.get('session');
  if (!session) return c.json({ error: 'Unauthorized' }, 401);

  try {
    const productsList = await prisma.product.findMany({
      where: {
        isDeleted: false,
      },
      orderBy: {
        name: 'asc',
      },
    });
    return c.json({ data: productsList });
  } catch (error) {
    console.error('Failed to fetch products:', error);
    return c.json({ error: 'Failed to fetch products' }, 500);
  }
});

// Create a new product (on the fly or via admin)
products.post('/', zValidator('json', productSchema), async (c) => {
  const session = c.get('session');
  if (!session) return c.json({ error: 'Unauthorized' }, 401);

  const { name } = c.req.valid('json');

  try {
    // Check if product with same name already exists
    const existing = await prisma.product.findUnique({
      where: { name },
    });

    if (existing) {
      // If it exists but is deleted, we could restore it
      if (existing.isDeleted) {
        const restored = await prisma.product.update({
          where: { id: existing.id },
          data: { isDeleted: false, createdBy: session.userId },
        });
        return c.json({ data: restored, message: 'Restored deleted product' });
      }
      return c.json({ error: 'ชื่อสินค้านี้มีอยู่ในระบบแล้ว' }, 400);
    }

    const newProduct = await prisma.product.create({
      data: {
        name,
        createdBy: session.userId,
      },
    });

    return c.json({ data: newProduct });
  } catch (error) {
    console.error('Failed to create product:', error);
    return c.json({ error: 'Failed to create product' }, 500);
  }
});

// Update a product
products.put('/:id', zValidator('json', productSchema), async (c) => {
  const session = c.get('session');
  if (!session) return c.json({ error: 'Unauthorized' }, 401);

  const id = parseInt(c.req.param('id'), 10);
  const { name } = c.req.valid('json');

  if (isNaN(id)) return c.json({ error: 'Invalid ID' }, 400);

  try {
    const existing = await prisma.product.findUnique({
      where: { name },
    });

    // If another product has the same name
    if (existing && existing.id !== id) {
      return c.json({ error: 'ชื่อสินค้านี้มีอยู่แล้วในระบบ' }, 400);
    }

    const updated = await prisma.product.update({
      where: { id },
      data: { name },
    });

    return c.json({ data: updated });
  } catch (error) {
    console.error('Failed to update product:', error);
    return c.json({ error: 'Failed to update product' }, 500);
  }
});

// Delete a product (Soft delete)
products.delete('/:id', async (c) => {
  const session = c.get('session');
  if (!session) return c.json({ error: 'Unauthorized' }, 401);

  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) return c.json({ error: 'Invalid ID' }, 400);

  try {
    const deleted = await prisma.product.update({
      where: { id },
      data: { isDeleted: true },
    });
    return c.json({ data: deleted });
  } catch (error) {
    console.error('Failed to soft delete product:', error);
    return c.json({ error: 'Failed to delete product' }, 500);
  }
});

export default products;
