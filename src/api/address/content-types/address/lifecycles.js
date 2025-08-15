// File: src/api/address/content-types/address/lifecycles.js

module.exports = {
  async beforeUpdate(event) {
    const { data, where } = event.params;
    
    console.log('🔍 beforeUpdate - data:', JSON.stringify(data, null, 2));
    
    // Only proceed if setting isDefault to true
    if (data.isDefault !== true) {
      console.log('⏭️ Skipping - isDefault is not true');
      return;
    }

    try {
      // Get the current address using entity service
      const currentAddress = await strapi.entityService.findOne('api::address.address', where.id, {
        populate: ['address']
      });
      
      console.log('🔍 Current address:', JSON.stringify(currentAddress, null, 2));
      
      if (!currentAddress?.address) {
        console.log('❌ No address relation found');
        return;
      }

      // Extract user ID from the relation
      const userId = currentAddress.address.id;
      console.log('🔍 User ID:', userId);

      // Find other addresses for this user that are currently default
      const otherDefaults = await strapi.entityService.findMany('api::address.address', {
        filters: {
          address: userId,
          id: { $ne: where.id },
          isDefault: true
        }
      });
      
      console.log(`🔍 Found ${otherDefaults.length} other default addresses to update`);
      
      // Update them to false AND publish the changes
      for (const addr of otherDefaults) {
        console.log(`🔄 Setting address ${addr.id} to non-default and publishing`);
        await strapi.entityService.update('api::address.address', addr.id, {
          data: { 
            isDefault: false,
            publishedAt: new Date() // This ensures the change is published
          }
        });
      }
      
      console.log('✅ beforeUpdate completed successfully');
      
    } catch (error) {
      console.error('❌ Error in beforeUpdate:', error.message);
      console.error('❌ Stack:', error.stack);
    }
  },

  async afterCreate(event) {
    const { result } = event;
    
    console.log('🔍 afterCreate - result:', JSON.stringify(result, null, 2));
    
    // Only proceed if created with isDefault: true
    if (result.isDefault !== true) {
      console.log('⏭️ Skipping afterCreate - not default');
      return;
    }

    try {
      // Get the full address with populated relations using entity service
      const fullAddress = await strapi.entityService.findOne('api::address.address', result.id, {
        populate: ['address']
      });
      
      console.log('🔍 Full address with relations:', JSON.stringify(fullAddress, null, 2));
      
      if (!fullAddress?.address) {
        console.log('❌ No address relation found in full address');
        return;
      }

      // Extract user ID from the relation
      const userId = fullAddress.address.id;
      console.log('🔍 Extracted user ID:', userId);
      
      if (!userId) {
        console.log('❌ Could not extract user ID');
        return;
      }
      
      // Find other default addresses for this user (exclude the one just created)
      const otherDefaults = await strapi.entityService.findMany('api::address.address', {
        filters: {
          address: userId,
          id: { $ne: result.id },
          isDefault: true
        }
      });
      
      console.log(`🔍 Found ${otherDefaults.length} other default addresses to update`);
      
      // Update other defaults to false AND publish
      for (const addr of otherDefaults) {
        console.log(`🔄 Setting other address ${addr.id} to non-default and publishing`);
        await strapi.entityService.update('api::address.address', addr.id, {
          data: { 
            isDefault: false,
            publishedAt: new Date() // This publishes the change
          }
        });
      }
      
      console.log('✅ afterCreate completed successfully');
      
    } catch (error) {
      console.error('❌ Error in afterCreate:', error.message);
      console.error('❌ Stack:', error.stack);
    }
  }
};





// // File: src/api/address/content-types/address/lifecycles.js

// module.exports = {
//   async beforeUpdate(event) {
//     const { data, where } = event.params;
    
//     console.log('🔍 beforeUpdate - data:', JSON.stringify(data, null, 2));
    
//     // Only proceed if setting isDefault to true
//     if (data.isDefault !== true) {
//       console.log('⏭️ Skipping - isDefault is not true');
//       return;
//     }

//     try {
//       // Get the current address to find the user ID
//       const currentAddress = await strapi.documents('api::address.address').findOne({
//         documentId: where.documentId,
//         populate: ['address']
//       });
      
//       console.log('🔍 Current address:', JSON.stringify(currentAddress, null, 2));
      
//       if (!currentAddress?.address) {
//         console.log('❌ No address relation found');
//         return;
//       }

//       // Extract user ID from the relation
//       const userId = currentAddress.address.id;
//       console.log('🔍 User ID:', userId);

//       // Find other addresses for this user that are currently default
//       const otherDefaults = await strapi.documents('api::address.address').findMany({
//         filters: {
//           address: userId,
//           documentId: { $ne: where.documentId },
//           isDefault: true
//         }
//       });
      
//       console.log(`🔍 Found ${otherDefaults.length} other default addresses to update`);
      
//       // Update them to false
//       for (const addr of otherDefaults) {
//         console.log(`🔄 Setting address ${addr.documentId} to non-default`);
//         await strapi.documents('api::address.address').update({
//           documentId: addr.documentId,
//           data: { isDefault: false }
//         });
//       }
      
//       console.log('✅ beforeUpdate completed successfully');
      
//     } catch (error) {
//       console.error('❌ Error in beforeUpdate:', error.message);
//       console.error('❌ Stack:', error.stack);
//     }
//   },

//   // Use afterCreate instead of beforeCreate to avoid the double-run issue
//   async afterCreate(event) {
//     const { result } = event;
    
//     console.log('🔍 afterCreate - result:', JSON.stringify(result, null, 2));
    
//     // Only proceed if created with isDefault: true
//     if (result.isDefault !== true) {
//       console.log('⏭️ Skipping afterCreate - not default');
//       return;
//     }

//     try {
//       // Get the full address with populated relations
//       const fullAddress = await strapi.documents('api::address.address').findOne({
//         documentId: result.documentId,
//         populate: ['address']
//       });
      
//       console.log('🔍 Full address with relations:', JSON.stringify(fullAddress, null, 2));
      
//       if (!fullAddress?.address) {
//         console.log('❌ No address relation found in full address');
//         return;
//       }

//       // Extract user ID from the relation
//       const userId = fullAddress.address.id;
//       console.log('🔍 Extracted user ID:', userId);
      
//       if (!userId) {
//         console.log('❌ Could not extract user ID');
//         return;
//       }
      
//       // First, let's see ALL addresses for this user to debug
//       const allUserAddresses = await strapi.documents('api::address.address').findMany({
//         filters: {
//           address: userId
//         }
//       });
      
//       console.log(`🔍 DEBUG: Found ${allUserAddresses.length} total addresses for user ${userId}:`);
//       allUserAddresses.forEach((addr, index) => {
//         console.log(`  ${index + 1}. documentId: ${addr.documentId}, isDefault: ${addr.isDefault}, publishedAt: ${addr.publishedAt}`);
//       });
      
//       // Now find other default addresses for this user (exclude the one just created)
//       const otherDefaults = await strapi.documents('api::address.address').findMany({
//         filters: {
//           address: userId,
//           documentId: { $ne: result.documentId },
//           isDefault: true
//         }
//       });
      
//       console.log(`🔍 Found ${otherDefaults.length} other default addresses to update`);
//       otherDefaults.forEach((addr, index) => {
//         console.log(`  ${index + 1}. Will update documentId: ${addr.documentId}`);
//       });
      
//       // Also try without the documentId filter to see if that's the issue
//       const otherDefaultsWithoutFilter = await strapi.documents('api::address.address').findMany({
//         filters: {
//           address: userId,
//           isDefault: true
//         }
//       });
      
//       console.log(`🔍 DEBUG: Found ${otherDefaultsWithoutFilter.length} default addresses WITHOUT documentId filter:`);
//       otherDefaultsWithoutFilter.forEach((addr, index) => {
//         console.log(`  ${index + 1}. documentId: ${addr.documentId}, same as current? ${addr.documentId === result.documentId}`);
//       });
      
//       // Update other defaults to false
//       for (const addr of otherDefaults) {
//         console.log(`🔄 Setting other address ${addr.documentId} to non-default`);
//         await strapi.documents('api::address.address').update({
//           documentId: addr.documentId,
//           data: { isDefault: false }
//         });
//       }
      
//       console.log('✅ afterCreate completed successfully');
      
//     } catch (error) {
//       console.error('❌ Error in afterCreate:', error.message);
//       console.error('❌ Stack:', error.stack);
//     }
//   }
// };