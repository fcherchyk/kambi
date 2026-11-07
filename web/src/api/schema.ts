// Generated from web/openapi.json by openapi-typescript. Do not edit: run `pnpm gen:api`.

export interface paths {
    "/api/auth/callback": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Callback */
        get: operations["callback_api_auth_callback_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/auth/login": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Login */
        get: operations["login_api_auth_login_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/auth/logout": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Logout */
        post: operations["logout_api_auth_logout_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/boards": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Boards */
        get: operations["list_boards_api_boards_get"];
        put?: never;
        /** Create Board */
        post: operations["create_board_api_boards_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/boards/{board_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Board */
        get: operations["get_board_api_boards__board_id__get"];
        put?: never;
        post?: never;
        /** Delete Board */
        delete: operations["delete_board_api_boards__board_id__delete"];
        options?: never;
        head?: never;
        /** Rename Board */
        patch: operations["rename_board_api_boards__board_id__patch"];
        trace?: never;
    };
    "/api/boards/{board_id}/archive": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Archive */
        get: operations["get_archive_api_boards__board_id__archive_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/boards/{board_id}/card-types": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Create Card Type */
        post: operations["create_card_type_api_boards__board_id__card_types_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/boards/{board_id}/columns": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Create Column */
        post: operations["create_column_api_boards__board_id__columns_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/card-types/{type_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** Delete Card Type */
        delete: operations["delete_card_type_api_card_types__type_id__delete"];
        options?: never;
        head?: never;
        /** Update Card Type */
        patch: operations["update_card_type_api_card_types__type_id__patch"];
        trace?: never;
    };
    "/api/cards/{card_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** Delete Card */
        delete: operations["delete_card_api_cards__card_id__delete"];
        options?: never;
        head?: never;
        /** Update Card */
        patch: operations["update_card_api_cards__card_id__patch"];
        trace?: never;
    };
    "/api/cards/{card_id}/move": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Move Card */
        post: operations["move_card_api_cards__card_id__move_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/columns/{column_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** Delete Column */
        delete: operations["delete_column_api_columns__column_id__delete"];
        options?: never;
        head?: never;
        /** Rename Column */
        patch: operations["rename_column_api_columns__column_id__patch"];
        trace?: never;
    };
    "/api/columns/{column_id}/archive": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Archive Column */
        post: operations["archive_column_api_columns__column_id__archive_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/columns/{column_id}/cards": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Create Card */
        post: operations["create_card_api_columns__column_id__cards_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/columns/{column_id}/move": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Move Column */
        post: operations["move_column_api_columns__column_id__move_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/columns/{column_id}/restore": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Restore Column */
        post: operations["restore_column_api_columns__column_id__restore_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/me": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Me */
        get: operations["me_api_me_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        /** ArchivedColumnOut */
        ArchivedColumnOut: {
            /** Archived At */
            archived_at: string | null;
            /**
             * Board Id
             * Format: uuid
             */
            board_id: string;
            /** Cards */
            cards: components["schemas"]["CardOut"][];
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Name */
            name: string;
            /** Sort Key */
            sort_key: string;
            /** Version */
            version: number;
        };
        /** BoardArchive */
        BoardArchive: {
            /**
             * Board Id
             * Format: uuid
             */
            board_id: string;
            /** Columns */
            columns: components["schemas"]["ArchivedColumnOut"][];
        };
        /** BoardCreate */
        BoardCreate: {
            /** Name */
            name: string;
        };
        /**
         * BoardDetail
         * @description The active board: active columns, every type, and the cards of active columns.
         */
        BoardDetail: {
            /** Card Types */
            card_types: components["schemas"]["CardTypeOut"][];
            /** Cards */
            cards: components["schemas"]["CardOut"][];
            /** Columns */
            columns: components["schemas"]["ColumnOut"][];
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Name */
            name: string;
            /**
             * Updated At
             * Format: date-time
             */
            updated_at: string;
            /** Version */
            version: number;
        };
        /** BoardOut */
        BoardOut: {
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Name */
            name: string;
            /**
             * Updated At
             * Format: date-time
             */
            updated_at: string;
            /** Version */
            version: number;
        };
        /** BoardRename */
        BoardRename: {
            /** Name */
            name: string;
            /**
             * Version
             * @description The version the client last saw
             */
            version: number;
        };
        /** CardCreate */
        CardCreate: {
            /**
             * Description
             * @default
             */
            description: string;
            /** Title */
            title: string;
            /**
             * Type Id
             * @description Defaults to the board's first type
             */
            type_id?: string | null;
        };
        /** CardMove */
        CardMove: {
            /**
             * After Id
             * @description Card to move after; null for first
             */
            after_id: string | null;
            /**
             * Column Id
             * Format: uuid
             */
            column_id: string;
            /**
             * Version
             * @description The version the client last saw
             */
            version: number;
        };
        /** CardOut */
        CardOut: {
            /**
             * Board Id
             * Format: uuid
             */
            board_id: string;
            /**
             * Column Id
             * Format: uuid
             */
            column_id: string;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /** Description */
            description: string;
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Sort Key */
            sort_key: string;
            /** Title */
            title: string;
            /**
             * Type Id
             * Format: uuid
             */
            type_id: string;
            /**
             * Updated At
             * Format: date-time
             */
            updated_at: string;
            /** Version */
            version: number;
        };
        /** CardTypeCreate */
        CardTypeCreate: {
            /**
             * Color
             * @enum {string}
             */
            color: "yellow" | "orange" | "red" | "pink" | "purple" | "blue" | "teal" | "green" | "gray" | "brown";
            /** Name */
            name: string;
        };
        /** CardTypeOut */
        CardTypeOut: {
            /**
             * Board Id
             * Format: uuid
             */
            board_id: string;
            /** Color */
            color: string;
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Name */
            name: string;
            /** Sort Key */
            sort_key: string;
            /** Version */
            version: number;
        };
        /** CardTypeUpdate */
        CardTypeUpdate: {
            /** Color */
            color?: ("yellow" | "orange" | "red" | "pink" | "purple" | "blue" | "teal" | "green" | "gray" | "brown") | null;
            /** Name */
            name?: string | null;
            /**
             * Version
             * @description The version the client last saw
             */
            version: number;
        };
        /** CardUpdate */
        CardUpdate: {
            /** Description */
            description?: string | null;
            /** Title */
            title?: string | null;
            /** Type Id */
            type_id?: string | null;
            /**
             * Version
             * @description The version the client last saw
             */
            version: number;
        };
        /** ColumnCreate */
        ColumnCreate: {
            /**
             * After Id
             * @description Active column to insert after; null puts it first; omit it to append
             */
            after_id?: string | null;
            /** Name */
            name: string;
        };
        /** ColumnMove */
        ColumnMove: {
            /**
             * After Id
             * @description Active column to move after; null for first
             */
            after_id: string | null;
            /**
             * Version
             * @description The version the client last saw
             */
            version: number;
        };
        /** ColumnOut */
        ColumnOut: {
            /** Archived At */
            archived_at: string | null;
            /**
             * Board Id
             * Format: uuid
             */
            board_id: string;
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Name */
            name: string;
            /** Sort Key */
            sort_key: string;
            /** Version */
            version: number;
        };
        /** ColumnRename */
        ColumnRename: {
            /** Name */
            name: string;
            /**
             * Version
             * @description The version the client last saw
             */
            version: number;
        };
        /** HTTPValidationError */
        HTTPValidationError: {
            /** Detail */
            detail?: components["schemas"]["ValidationError"][];
        };
        /** UserOut */
        UserOut: {
            /** Avatar Url */
            avatar_url: string | null;
            /** Email */
            email: string;
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Name */
            name: string;
        };
        /** ValidationError */
        ValidationError: {
            /** Context */
            ctx?: Record<string, never>;
            /** Input */
            input?: unknown;
            /** Location */
            loc: (string | number)[];
            /** Message */
            msg: string;
            /** Error Type */
            type: string;
        };
        /** VersionBody */
        VersionBody: {
            /**
             * Version
             * @description The version the client last saw
             */
            version: number;
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    callback_api_auth_callback_get: {
        parameters: {
            query?: {
                code?: string;
                state?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            302: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    login_api_auth_login_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            302: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
        };
    };
    logout_api_auth_logout_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    list_boards_api_boards_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["BoardOut"][];
                };
            };
        };
    };
    create_board_api_boards_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["BoardCreate"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["BoardOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    get_board_api_boards__board_id__get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                board_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["BoardDetail"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    delete_board_api_boards__board_id__delete: {
        parameters: {
            query: {
                /** @description The version the client last saw */
                version: number;
            };
            header?: never;
            path: {
                board_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    rename_board_api_boards__board_id__patch: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                board_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["BoardRename"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["BoardOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    get_archive_api_boards__board_id__archive_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                board_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["BoardArchive"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    create_card_type_api_boards__board_id__card_types_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                board_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CardTypeCreate"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CardTypeOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    create_column_api_boards__board_id__columns_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                board_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ColumnCreate"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ColumnOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    delete_card_type_api_card_types__type_id__delete: {
        parameters: {
            query: {
                /** @description The version the client last saw */
                version: number;
                replace_with?: string | null;
            };
            header?: never;
            path: {
                type_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    update_card_type_api_card_types__type_id__patch: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                type_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CardTypeUpdate"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CardTypeOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    delete_card_api_cards__card_id__delete: {
        parameters: {
            query: {
                /** @description The version the client last saw */
                version: number;
            };
            header?: never;
            path: {
                card_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    update_card_api_cards__card_id__patch: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                card_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CardUpdate"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CardOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    move_card_api_cards__card_id__move_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                card_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CardMove"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CardOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    delete_column_api_columns__column_id__delete: {
        parameters: {
            query: {
                /** @description The version the client last saw */
                version: number;
                cards?: ("move" | "delete") | null;
                target?: string | null;
            };
            header?: never;
            path: {
                column_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    rename_column_api_columns__column_id__patch: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                column_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ColumnRename"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ColumnOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    archive_column_api_columns__column_id__archive_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                column_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["VersionBody"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ColumnOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    create_card_api_columns__column_id__cards_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                column_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CardCreate"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CardOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    move_column_api_columns__column_id__move_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                column_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ColumnMove"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ColumnOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    restore_column_api_columns__column_id__restore_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                column_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["VersionBody"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ColumnOut"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    me_api_me_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UserOut"];
                };
            };
        };
    };
}
