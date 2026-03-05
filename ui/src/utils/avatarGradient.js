const GRADIENTS = {
  A: 'linear-gradient(135deg, #F5A07A, #E8703D)',
  B: 'linear-gradient(135deg, #93C5FD, #2563EB)',
  C: 'linear-gradient(135deg, #86EFAC, #1A9E6A)',
  D: 'linear-gradient(135deg, #FCD34D, #D97706)',
  E: 'linear-gradient(135deg, #5EE0A8, #16A071)',
  F: 'linear-gradient(135deg, #F9A8D4, #EC4899)',
  G: 'linear-gradient(135deg, #F5A07A, #E8703D)',
  H: 'linear-gradient(135deg, #A5F3FC, #0891B2)',
  I: 'linear-gradient(135deg, #C4B5FD, #6D4FC2)',
  J: 'linear-gradient(135deg, #B8A5F5, #6B4FBF)',
  K: 'linear-gradient(135deg, #6EE7B7, #1A9E6A)',
  L: 'linear-gradient(135deg, #FCA5A5, #DC2626)',
  M: 'linear-gradient(135deg, #93C5FD, #2563EB)',
  N: 'linear-gradient(135deg, #FDE68A, #F59E0B)',
  O: 'linear-gradient(135deg, #A5B4FC, #4F46E5)',
  P: 'linear-gradient(135deg, #FCA5A5, #DC2626)',
  Q: 'linear-gradient(135deg, #6EE7B7, #1A9E6A)',
  R: 'linear-gradient(135deg, #F5A07A, #EA580C)',
  S: 'linear-gradient(135deg, #7EC8F8, #2563EB)',
  T: 'linear-gradient(135deg, #FCD34D, #B45309)',
  U: 'linear-gradient(135deg, #C4B5FD, #6B4FBF)',
  V: 'linear-gradient(135deg, #86EFAC, #15803D)',
  W: 'linear-gradient(135deg, #5EE0A8, #0D9488)',
  X: 'linear-gradient(135deg, #F472B6, #BE185D)',
  Y: 'linear-gradient(135deg, #FDE68A, #CA8A04)',
  Z: 'linear-gradient(135deg, #93C5FD, #1D4ED8)',
}

export function getAvatarGradient(name) {
  const initial = (name || 'A')[0].toUpperCase()
  return GRADIENTS[initial] || GRADIENTS['A']
}
