import { ab } from '../data/constants';

export default function Avatar({ name, size = 36, style = {} }) {
  const bg = ab(name);
  const ini = name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: bg, color: 'white',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize: size * 0.37, fontFamily: 'Inter,sans-serif',
      flexShrink: 0, ...style,
    }}>
      {ini}
    </div>
  );
}
