import { Input } from '../input';

export interface LeagueInputProps {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}

export function LeagueInput({ value, placeholder, onChange }: LeagueInputProps) {
  return (
    <Input
      value={value}
      placeholder={placeholder}
      onChangeText={onChange}
      inputMode="numeric"
      fontFamily="$mono"
    />
  );
}
