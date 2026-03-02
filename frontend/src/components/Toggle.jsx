export default function Toggle({ on, onChange }) {
  return (
    <div className={`toggle ${on ? 'on' : 'off'}`} onClick={onChange}>
      <div className="toggle-thumb" />
    </div>
  );
}
