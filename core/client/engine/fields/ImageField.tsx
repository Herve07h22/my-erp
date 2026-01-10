import React, { useState, ChangeEvent, useRef } from 'react';

interface ImageFieldProps {
  name: string;
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  disabled?: boolean;
  required?: boolean;
  hasError?: boolean;
  multiple?: boolean; // Pour gérer plusieurs images
}

const API_BASE = '/api';

/**
 * Composant pour l'upload et l'affichage d'images
 */
export function ImageField({
  name,
  value,
  onChange,
  disabled = false,
  required = false,
  hasError = false,
  multiple = false,
}: ImageFieldProps): React.ReactElement {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setError(null);

    try {
      if (multiple) {
        // Upload multiple
        const formData = new FormData();
        Array.from(files).forEach((file) => {
          formData.append('files', file);
        });

        const res = await fetch(`${API_BASE}/upload/multiple`, {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();

        if (data.success) {
          const urls = data.data.map((file: { url: string }) => file.url);
          // Si c'est un tableau JSON, on le met à jour
          const currentValue = value ? JSON.parse(value as string) : [];
          onChange(JSON.stringify([...currentValue, ...urls]));
        } else {
          setError(data.error || 'Erreur lors de l\'upload');
        }
      } else {
        // Upload simple
        const formData = new FormData();
        formData.append('file', files[0]);

        const res = await fetch(`${API_BASE}/upload`, {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();

        if (data.success) {
          onChange(data.data.url);
        } else {
          setError(data.error || 'Erreur lors de l\'upload');
        }
      }
    } catch (err) {
      setError('Erreur lors de l\'upload : ' + (err as Error).message);
    } finally {
      setUploading(false);
      // Réinitialiser l'input pour permettre de re-sélectionner le même fichier
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = (): void => {
    onChange(null);
  };

  const handleRemoveFromArray = (urlToRemove: string): void => {
    if (!value) return;
    try {
      const urls = JSON.parse(value as string) as string[];
      const filtered = urls.filter((url) => url !== urlToRemove);
      onChange(filtered.length > 0 ? JSON.stringify(filtered) : null);
    } catch {
      onChange(null);
    }
  };

  // Si multiple, parser le JSON
  let imageUrls: string[] = [];
  if (multiple && value) {
    try {
      imageUrls = JSON.parse(value as string) as string[];
    } catch {
      imageUrls = [];
    }
  } else if (!multiple && value) {
    imageUrls = [value as string];
  }

  return (
    <div className={`field-image ${hasError ? 'has-error' : ''}`}>
      {!multiple && value && (
        <div className="image-preview">
          <img src={value as string} alt="Preview" />
          {!disabled && (
            <button
              type="button"
              onClick={handleRemove}
              className="btn-remove-image"
              title="Supprimer l'image"
            >
              ×
            </button>
          )}
        </div>
      )}

      {multiple && imageUrls.length > 0 && (
        <div className="image-gallery">
          {imageUrls.map((url, index) => (
            <div key={index} className="image-preview">
              <img src={url} alt={`Image ${index + 1}`} />
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemoveFromArray(url)}
                  className="btn-remove-image"
                  title="Supprimer l'image"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {!disabled && (
        <div className="image-upload">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            disabled={uploading || disabled}
            multiple={multiple}
            className="file-input"
            id={`${name}-file-input`}
          />
          <label
            htmlFor={`${name}-file-input`}
            className={`upload-button ${uploading ? 'uploading' : ''}`}
          >
            {uploading ? (
              'Upload en cours...'
            ) : multiple ? (
              'Ajouter des images'
            ) : (
              value ? 'Remplacer l\'image' : 'Choisir une image'
            )}
          </label>
        </div>
      )}

      {error && <div className="field-error-message">{error}</div>}
    </div>
  );
}

export default ImageField;
