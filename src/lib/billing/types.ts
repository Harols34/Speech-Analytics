
export type InvoiceFieldType = 'text' | 'number' | 'date' | 'select';

export interface InvoiceField {
  name: string;
  label: string;
  type: InvoiceFieldType;
  required?: boolean;
  calculated?: boolean;
  options?: string[];
}

export interface CompanyInfo {
  name?: string;
  logo?: string;
  address?: string;
  phone?: string;
  email?: string;
}

export interface InvoiceTemplate {
  id?: string;
  name: string;
  description?: string | null;
  company_info: CompanyInfo;
  header_fields: InvoiceField[];
  item_fields: InvoiceField[];
  footer_fields: InvoiceField[];
  styles: {
    primaryColor?: string;
    fontFamily?: string;
    fontSize?: string;
  };
  is_active: boolean;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
}
