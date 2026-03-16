import { z } from 'zod';

export const ShipStationAddressSchema = z.object({
  name: z.string(),
  company: z.string().optional(),
  street1: z.string(),
  street2: z.string().optional(),
  street3: z.string().optional(),
  city: z.string(),
  state: z.string(),
  postalCode: z.string(),
  country: z.string(),
  phone: z.string().optional(),
  residential: z.boolean().optional(),
});
export type ShipStationAddress = z.infer<typeof ShipStationAddressSchema>;

// V1 types
export interface V1Store {
  storeId: number;
  storeName: string;
  marketplaceId: number;
  marketplaceName: string;
  active: boolean;
}

export interface V1Order {
  orderId: number;
  orderNumber: string;
  orderKey: string;
  orderDate: string;
  orderStatus: string;
  customerEmail: string;
  shipTo: ShipStationAddress;
  items: V1OrderItem[];
  orderTotal: number;
  amountPaid: number;
}

export interface V1OrderItem {
  orderItemId: number;
  lineItemKey: string;
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

// V2 types
export interface V2Carrier {
  carrier_id: string;
  carrier_code: string;
  account_number: string;
  name: string;
  friendly_name: string;
}

export interface V2Service {
  carrier_id: string;
  carrier_code: string;
  service_code: string;
  name: string;
  domestic: boolean;
  international: boolean;
  is_multi_package_supported: boolean;
}

export interface V2Package {
  package_id: string;
  package_code: string;
  name: string;
  dimensions: { length: number; width: number; height: number; unit: string } | null;
}

export interface V2LabelRequest {
  shipment: {
    carrier_id: string;
    service_code: string;
    ship_to: {
      name: string;
      phone?: string;
      address_line1: string;
      address_line2?: string;
      city_locality: string;
      state_province: string;
      postal_code: string;
      country_code: string;
      address_residential_indicator?: string;
    };
    ship_from: {
      name: string;
      phone?: string;
      address_line1: string;
      address_line2?: string;
      city_locality: string;
      state_province: string;
      postal_code: string;
      country_code: string;
    };
    packages: Array<{
      weight: { value: number; unit: string };
      dimensions?: { height: number; width: number; length: number; unit: string };
    }>;
  };
}

export interface V2LabelResponse {
  label_id: string;
  status: string;
  tracking_number: string;
  label_download: {
    pdf: string;
    png: string;
    zpl: string;
  };
  shipment_cost: { currency: string; amount: number };
}

export interface V2RateResponse {
  rate_response: {
    rates: Array<{
      rate_id: string;
      rate_type: string;
      carrier_id: string;
      shipping_amount: { currency: string; amount: number };
      insurance_amount: { currency: string; amount: number };
      service_code: string;
      service_type: string;
      package_type: string;
      estimated_delivery_date: string;
      delivery_days: number;
    }>;
  };
}
