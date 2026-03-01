import { useContext } from 'react';
import { RiskContext } from '../context/RiskContext';

export function useRisk() {
    return useContext(RiskContext);
}
