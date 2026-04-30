import React, { useState } from 'react';
import { DeletionCheck } from '../types/referentialIntegrity';

interface DeletionConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  entityType: 'user' | 'category' | 'item' | 'supplier';
  entityName: string;
  deletionCheck: DeletionCheck | null;
  loading: boolean;
}

export const DeletionConfirmationModal: React.FC<DeletionConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  entityType,
  entityName,
  deletionCheck,
  loading
}) => {
  const [confirmText, setConfirmText] = useState('');
  const expectedText = `DELETE ${entityName}`;

  if (!isOpen) return null;

  const canProceed = deletionCheck?.canDelete && confirmText === expectedText;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-card rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center mb-4">
          <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mr-3">
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.936-.833-2.707 0L3.107 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900">
            Delete {entityType.charAt(0).toUpperCase() + entityType.slice(1)}: {entityName}
          </h2>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Checking for dependencies...</p>
          </div>
        ) : deletionCheck ? (
          <div className="space-y-4">
            {!deletionCheck.canDelete ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="text-lg font-medium text-red-800">Cannot Delete</h3>
                </div>
                <p className="text-red-700 mb-3">
                  This {entityType} cannot be deleted because it is still being referenced:
                </p>
                <ul className="space-y-2">
                  {deletionCheck.blockedBy.map((block, index) => (
                    <li key={index} className="flex items-start">
                      <span className="inline-block w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                      <span className="text-red-700">
                        <strong>{block.count}</strong> {block.description}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.936-.833-2.707 0L3.107 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <h3 className="text-lg font-medium text-yellow-800">Deletion Will Affect Records</h3>
                </div>
                <p className="text-yellow-700 mb-3">
                  Deleting this {entityType} will affect the following records:
                </p>
                {deletionCheck.warnings.length > 0 ? (
                  <ul className="space-y-2">
                    {deletionCheck.warnings.map((warning, index) => (
                      <li key={index} className="flex items-start">
                        <span className={`inline-block w-2 h-2 rounded-full mt-2 mr-3 flex-shrink-0 ${
                          warning.action === 'cascade' ? 'bg-red-500' : 'bg-yellow-500'
                        }`}></span>
                        <span className="text-yellow-700">
                          <strong>{warning.count}</strong> {warning.description}
                          {warning.action === 'cascade' && <span className="text-red-600 font-medium"> (will be deleted)</span>}
                          {warning.action === 'nullify' && <span className="text-yellow-600 font-medium"> (reference will be cleared)</span>}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-green-700">No dependent records found. Safe to delete.</p>
                )}
              </div>
            )}

            {deletionCheck.canDelete && (
              <div className="bg-muted border border-border rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  To confirm deletion, type: <code className="bg-gray-200 px-2 py-1 rounded">{expectedText}</code>
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder={`Type "${expectedText}" to confirm`}
                />
              </div>
            )}
          </div>
        ) : null}

        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Cancel
          </button>
          {deletionCheck?.canDelete && (
            <button
              onClick={onConfirm}
              disabled={!canProceed}
              className={`px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 ${
                canProceed
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Delete {entityType.charAt(0).toUpperCase() + entityType.slice(1)}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
