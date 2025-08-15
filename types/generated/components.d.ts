import type { Schema, Struct } from '@strapi/strapi';

export interface AddressAddress extends Struct.ComponentSchema {
  collectionName: 'components_address_addresses';
  info: {
    displayName: 'address';
  };
  attributes: {
    deliveryAddress: Schema.Attribute.String;
    deliveryCity: Schema.Attribute.String;
    deliveryContact: Schema.Attribute.String;
    deliveryCountry: Schema.Attribute.String;
    deliveryPostalCode: Schema.Attribute.String;
    deliveryState: Schema.Attribute.String;
    isDefault: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'address.address': AddressAddress;
    }
  }
}
