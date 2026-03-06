export interface AgreementFormRuntimeConfig {
    base_path?: string;
    api_base_path?: string;
    user_id?: string;
    is_edit?: boolean;
    create_success?: boolean;
    submit_mode?: 'form' | 'json' | string;
    routes?: {
        index?: string;
        documents?: string;
        create?: string;
        documents_upload_url?: string;
    };
    initial_participants?: Array<Record<string, any>>;
    initial_field_instances?: Array<Record<string, any>>;
}
export declare function initAgreementFormRuntime(inputConfig?: AgreementFormRuntimeConfig): void;
//# sourceMappingURL=agreement-form-runtime.d.ts.map