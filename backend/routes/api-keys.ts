import { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "../lib/supabase.js";

function generateApiKey(): string {
  return `irl_${uuidv4().replace(/-/g, "")}`;
}

export async function getApiKeys(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });
    
    const token = authHeader.replace('Bearer ', '');
    let decoded;
    try { decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET || 'secret'); }
    catch { return res.status(401).json({ error: 'Invalid token' }); }
    
    const { data: keys, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('user_id', decoded.id)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    const maskedKeys = (keys || []).map((key: any) => ({
      ...key,
      key: `${key.key.slice(0, 4)}...${key.key.slice(-4)}`,
    }));
    
    res.json({ keys: maskedKeys });
  } catch (error) {
    next(error);
  }
}

export async function createApiKey(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });
    
    const token = authHeader.replace('Bearer ', '');
    let decoded;
    try { decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET || 'secret'); }
    catch { return res.status(401).json({ error: 'Invalid token' }); }
    
    const { name } = req.body;
    
    // Check if user is agent
    const { data: user } = await supabase
      .from('users')
      .select('role')
      .eq('id', decoded.id)
      .single();
    
    if (user?.role !== 'agent') {
      return res.status(403).json({ error: 'Only agents can create API keys' });
    }
    
    const key = generateApiKey();
    const { data: newKey, error } = await supabase
      .from('api_keys')
      .insert({
        key,
        name: name || `Key ${Date.now()}`,
        user_id: decoded.id,
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      })
      .select()
      .single();
    
    if (error) throw error;
    
    res.json({ key: { ...newKey, key } });
  } catch (error) {
    next(error);
  }
}

export async function revokeApiKey(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });
    
    const token = authHeader.replace('Bearer ', '');
    let decoded;
    try { decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET || 'secret'); }
    catch { return res.status(401).json({ error: 'Invalid token' }); }
    
    const { id } = req.params;
    
    // Check ownership
    const { data: existing } = await supabase
      .from('api_keys')
      .select('id')
      .eq('id', id)
      .eq('user_id', decoded.id)
      .single();
    
    if (!existing) {
      return res.status(404).json({ error: 'API key not found' });
    }
    
    await supabase.from('api_keys').delete().eq('id', id);
    
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

export async function validateApiKey(req: Request, res: Response, next: NextFunction) {
  try {
    const apiKey = req.headers["x-api-key"] as string;
    
    if (!apiKey) {
      return res.status(401).json({ error: "API key required" });
    }
    
    const { data: key, error } = await supabase
      .from('api_keys')
      .select('*, user:users(*)')
      .eq('key', apiKey)
      .single();
    
    if (error || !key) {
      return res.status(401).json({ error: "Invalid API key" });
    }
    
    if (key.expires_at && new Date(key.expires_at) < new Date()) {
      return res.status(401).json({ error: "API key expired" });
    }
    
    // Update last used
    await supabase
      .from('api_keys')
      .update({ last_used: new Date().toISOString() })
      .eq('id', key.id);
    
    (req as any).apiKey = key;
    (req as any).agent = key.user;
    
    next();
  } catch (error) {
    next(error);
  }
}
