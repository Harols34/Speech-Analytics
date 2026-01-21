
import React from "react";
import { CompanyInfo } from "@/lib/billing/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CompanyInfoFormProps {
  value: CompanyInfo;
  onChange: (val: CompanyInfo) => void;
}

export default function CompanyInfoForm({ value, onChange }: CompanyInfoFormProps) {
  const patch = (p: Partial<CompanyInfo>) => onChange({ ...value, ...p });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label>Nombre empresa</Label>
          <Input value={value.name || ""} onChange={(e) => patch({ name: e.target.value })} placeholder="Convert-IA" />
        </div>
        <div>
          <Label>Logo (URL)</Label>
          <Input value={value.logo || ""} onChange={(e) => patch({ logo: e.target.value })} placeholder="/favicon.ico" />
        </div>
      </div>
      <div>
        <Label>Dirección</Label>
        <Input value={value.address || ""} onChange={(e) => patch({ address: e.target.value })} placeholder="Calle 123, Ciudad" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label>Teléfono</Label>
          <Input value={value.phone || ""} onChange={(e) => patch({ phone: e.target.value })} placeholder="+54 11 ..." />
        </div>
        <div>
          <Label>Email</Label>
          <Input value={value.email || ""} onChange={(e) => patch({ email: e.target.value })} placeholder="facturacion@empresa.com" />
        </div>
      </div>
    </div>
  );
}
