import React from 'react';
import { Card } from '../components/ui/card';

const PrivacyPolicy: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Card className="p-8">
        <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
        
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Data Collection</h2>
          <p className="mb-4">Smart File Manager collects the following information:</p>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>Google Drive file and folder information</li>
            <li>Basic profile information (name, email)</li>
            <li>Authentication tokens for Google Drive access</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Purpose of Data Collection</h2>
          <p className="mb-4">We collect this data to:</p>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>Provide file management and organization features</li>
            <li>Enable secure access to your Google Drive files</li>
            <li>Improve user experience and application functionality</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">How We Use Your Data</h2>
          <p className="mb-4">Your data is used solely for:</p>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>Displaying and managing your Google Drive files</li>
            <li>Authenticating your access to the application</li>
            <li>Maintaining your user session</li>
          </ul>
          <p>We do not sell, share, or distribute your data to third parties.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Data Security</h2>
          <p className="mb-4">We implement security measures to protect your data:</p>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>Secure authentication using industry-standard protocols</li>
            <li>Encrypted data transmission</li>
            <li>Secure token storage</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Revoking Access</h2>
          <p className="mb-4">You can revoke access to your data at any time by:</p>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>Visiting Google Account settings (https://myaccount.google.com/permissions)</li>
            <li>Finding "Smart File Manager" in the list of connected apps</li>
            <li>Clicking "Remove Access"</li>
          </ul>
          <p>After revoking access, we will no longer have access to your Google Drive data.</p>
        </section>

        <footer className="mt-8 pt-4 border-t">
          <p className="text-sm text-gray-600">
            Last updated: August 31, 2025
          </p>
        </footer>
      </Card>
    </div>
  );
};

export default PrivacyPolicy;
