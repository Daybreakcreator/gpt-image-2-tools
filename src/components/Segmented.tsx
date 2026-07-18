interface Option {
  value: string;
  label: string;
}

interface Props {
  label: string;
  value: string;
  options: Option[];
  onChange: (v: string) => void;
}

export default function Segmented({ label, value, options, onChange }: Props) {
  return (
    <div>
      <div className="mb-2 text-[11px] font-medium text-mut">{label}</div>
      <div className="flex rounded-[10px] border border-line bg-panel p-[3px]">
        {options.map((o) => {
          const active = value === o.value;
          return (
            <button
              key={o.value}
              onClick={() => onChange(o.value)}
              className={`flex-1 rounded-[7px] py-1.5 text-center text-xs transition ${
                active ? 'bg-panel3 font-medium text-fg' : 'text-fg2 hover:text-fg'
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
