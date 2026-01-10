import React, { useState, useEffect } from 'react';

interface Many2OneFieldProps {
  name: string;
  value: number | null;
  relation: string;
  onChange: (value: number | null) => void;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  hasError?: boolean;
}

interface RelatedRecord {
  id: number;
  name: string;
}

/**
 * Composant pour les champs many2one avec chargement du nom lié
 */
export function Many2OneField({
  name,
  value,
  relation,
  onChange,
  disabled = false,
  required = false,
  placeholder = '-- Sélectionner --',
  hasError = false,
}: Many2OneFieldProps): React.ReactElement {
  const [options, setOptions] = useState<RelatedRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Charger les enregistrements de la relation
  useEffect(() => {
    const fetchRelatedRecords = async () => {
      try {
        setLoading(true);
        setError(null);

        // Convertir le nom du modèle en chemin API (res.partner -> res/partner)
        const apiPath = relation.replace(/\./g, '/');
        const response = await fetch(`/api/${apiPath}`);

        if (!response.ok) {
          throw new Error(`Erreur lors du chargement des données`);
        }

        const result = await response.json();

        // L'API retourne { success, data, count }
        const data = result.data || [];

        // Extraire id et name de chaque enregistrement
        const records: RelatedRecord[] = data.map((record: Record<string, unknown>) => ({
          id: record.id as number,
          name: (record.name || record.display_name || `#${record.id}`) as string,
        }));

        setOptions(records);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
      } finally {
        setLoading(false);
      }
    };

    fetchRelatedRecords();
  }, [relation]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = e.target.value;
    onChange(selectedValue ? parseInt(selectedValue, 10) : null);
  };

  if (loading) {
    return (
      <select disabled className="field-input field-many2one">
        <option>Chargement...</option>
      </select>
    );
  }

  if (error) {
    return (
      <div className="field-many2one-error">
        <span className="error-text">{error}</span>
      </div>
    );
  }

  return (
    <select
      id={name}
      name={name}
      value={value ?? ''}
      onChange={handleChange}
      disabled={disabled}
      required={required}
      className={`field-input field-many2one${hasError ? ' field-error' : ''}`}
    >
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.name}
        </option>
      ))}
    </select>
  );
}

export default Many2OneField;
