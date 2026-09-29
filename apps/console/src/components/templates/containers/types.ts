export interface ProviderField {
  name: string;
  label: string;
  type: "text" | "textarea" | "number" | "string_list";
  placeholder?: string;
  description?: string;
  required?: boolean;
  spec_key?: string;
}

export interface ResourceProvider {
  id: string;
  name: string;
  description?: string;
  fields: ProviderField[];
}

export interface ContainerHelpers {
  updateContainer: (index: number, field: string, val: any) => void;
  addArrayItem: (cIndex: number, field: string, defaultItem: any) => void;
  updateArrayItem: (
    cIndex: number,
    field: string,
    iIndex: number,
    itemField: string,
    val: any,
  ) => void;
  removeArrayItem: (cIndex: number, field: string, iIndex: number) => void;
}
