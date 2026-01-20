
import { describe, it, expect } from 'vitest';
import { getCompetitiveCategory, getCategoryLabel } from './competitiveGroupUtils';

describe('competitiveGroupUtils', () => {
    describe('getCompetitiveCategory', () => {
        it('should identify URL designators', () => {
            expect(getCompetitiveCategory('1110').code).toBe('URL');
            expect(getCompetitiveCategory('1310').code).toBe('URL');
            expect(getCompetitiveCategory('1320').code).toBe('URL');
            expect(getCompetitiveCategory('1910').code).toBe('URL'); // 19xx
            expect(getCompetitiveCategory('1105').code).toBe('URL'); // Reserve URL is still URL by default if not specified otherwise

            // Mixed Case Checks
            expect(getCompetitiveCategory('11xx').code).toBe('URL');
            expect(getCompetitiveCategory('11XX').code).toBe('URL');
        });

        it('should identify Restricted Line (RL) designators', () => {
            expect(getCompetitiveCategory('1200').code).toBe('RL'); // HR
            expect(getCompetitiveCategory('1440').code).toBe('RL'); // ED
            expect(getCompetitiveCategory('1510').code).toBe('RL'); // AED
            expect(getCompetitiveCategory('1710').code).toBe('RL'); // FAO
            expect(getCompetitiveCategory('1800').code).not.toBe('RL'); // 18xx is IWL
        });

        it('should identify Information Warfare Line (IWL) designators', () => {
            expect(getCompetitiveCategory('1810').code).toBe('IWL');
            expect(getCompetitiveCategory('1830').code).toBe('IWL');
            expect(getCompetitiveCategory('1800').code).toBe('IWL');
        });

        it('should identify Staff designators', () => {
            expect(getCompetitiveCategory('2100').code).toBe('STAFF'); // Medical
            expect(getCompetitiveCategory('3100').code).toBe('STAFF'); // Supply
            expect(getCompetitiveCategory('4100').code).toBe('STAFF'); // Chaplain
            expect(getCompetitiveCategory('5100').code).toBe('STAFF'); // CEC
        });

        it('should distinguish Active vs Reserve LDO', () => {
            // Active LDO (ends in 0)
            expect(getCompetitiveCategory('6110').code).toBe('LDO_ACTIVE'); // Surface
            expect(getCompetitiveCategory('6410').code).toBe('LDO_ACTIVE'); // Gen Line

            // Reserve LDO (ends in 5 or 7)
            expect(getCompetitiveCategory('6115').code).toBe('LDO_CWO_RESERVE');
            expect(getCompetitiveCategory('6415').code).toBe('LDO_CWO_RESERVE');
            expect(getCompetitiveCategory('6417').code).toBe('LDO_CWO_RESERVE');
        });

        it('should distinguish Active vs Reserve CWO', () => {
            // Active CWO
            expect(getCompetitiveCategory('7110').code).toBe('CWO_ACTIVE'); // Surface CWO
            expect(getCompetitiveCategory('7130').code).toBe('CWO_ACTIVE');

            // Reserve CWO (grouped with Reserve LDO)
            expect(getCompetitiveCategory('7115').code).toBe('LDO_CWO_RESERVE');
            expect(getCompetitiveCategory('7815').code).toBe('LDO_CWO_RESERVE');
        });

        it('should handle unknown designators', () => {
            expect(getCompetitiveCategory('9999').code).toBe('UNKNOWN');
            expect(getCompetitiveCategory('').code).toBe('UNKNOWN');
        });
    });

    describe('getCategoryLabel', () => {
        it('should return correct labels', () => {
            expect(getCategoryLabel({ code: 'URL', name: 'Unrestricted Line' })).toBe('URL Active');
            expect(getCategoryLabel({ code: 'LDO_ACTIVE', name: 'Active LDO' })).toBe('LDO Active');
            expect(getCategoryLabel({ code: 'LDO_CWO_RESERVE', name: 'Reserve LDO/CWO' })).toBe('LDO/CWO Reserve');
        });
    });
});
