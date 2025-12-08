/**
 * Default persistence behavior using fetch API
 */
export class DefaultPersistenceBehavior {
    async save(endpoint, layout) {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(layout),
        });
        if (!response.ok) {
            throw new Error(`Failed to save layout: ${response.statusText}`);
        }
    }
    async load(endpoint) {
        try {
            const response = await fetch(endpoint);
            if (!response.ok) {
                return null;
            }
            return await response.json();
        }
        catch (error) {
            console.warn('Failed to load layout preferences:', error);
            return null;
        }
    }
}
//# sourceMappingURL=persistence.js.map