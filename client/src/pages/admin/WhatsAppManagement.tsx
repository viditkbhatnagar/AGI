import React from 'react';
import WhatsAppManagement from '../../components/admin/whatsapp-management';

const WhatsAppManagementPage = () => {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">WhatsApp Bot Management</h1>
        <p className="text-gray-600 mt-2">
          Manage and monitor the WhatsApp quiz bot for student interactions
        </p>
      </div>
      
      <WhatsAppManagement />
    </div>
  );
};

export default WhatsAppManagementPage;
