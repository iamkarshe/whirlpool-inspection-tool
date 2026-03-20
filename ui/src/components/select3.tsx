import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { useEffect, useId } from "react";

export default function SelectComponent() {
  const id = useId();

  useEffect(() => {
    console.log(id);
  }, [id]);

  return (
    <div className="w-full max-w-xs">
      <Select>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select framework" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="1">React</SelectItem>
          <SelectItem value="2">Next.js</SelectItem>
          <SelectItem value="3">Astro</SelectItem>
          <SelectItem value="4">Gatsby</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
