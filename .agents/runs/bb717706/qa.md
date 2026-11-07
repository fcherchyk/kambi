<!-- antigravity · gemini-3.8-flash-high · familia google -->

Se completó la verificación y ampliación de la suite de pruebas automatizadas a partir de los criterios de aceptación de la especificación técnica (`.agents/memory/specs/bb717706.md`).

No se modificó el código de producción; todos los casos borde y entradas inválidas fueron incorporados en los tests existentes dentro de [`api/tests/`](file:///Users/negro/hworkspace/projects/kambi/api/tests), ejecutando contra PostgreSQL real a través de la cadena de fallback (`testcontainers` / `pgserver`).

### Resumen de ejecución
- **Framework:** `pytest` con `pytest-cov`
- **Total de tests ejecutados:** 190 pasados
- **Defectos encontrados en producción:** 0 (todo el comportamiento cumple con la spec)
- **Cobertura de código de producción (`app`):** 99.35% de líneas (umbral mínimo requerido: 80%)

---

### Tabla de criterios, tests y resultados

| Criterio | Test | Resultado |
| :--- | :--- | :---: |
| **1. Compose publishes only on localhost** | [`test_criterion_1_compose_publishes_only_on_localhost`](file:///Users/negro/hworkspace/projects/kambi/api/tests/test_compose.py#L60) | PASÓ |
| | [`test_criterion_1_env_example_lists_every_variable_without_real_values`](file:///Users/negro/hworkspace/projects/kambi/api/tests/test_compose.py#L76) | PASÓ |
| | [`test_criterion_1_compose_reads_only_variables_listed_in_env_example`](file:///Users/negro/hworkspace/projects/kambi/api/tests/test_compose.py#L86) | PASÓ |
| | [`test_criterion_1_dot_env_is_ignored_by_git`](file:///Users/negro/hworkspace/projects/kambi/api/tests/test_compose.py#L92) | PASÓ |
| **2. Login with the fake Google** | [`test_criterion_2_login_creates_user_and_httponly_lax_session`](file:///Users/negro/hworkspace/projects/kambi/api/tests/test_auth.py#L15) | PASÓ |
| | [`test_criterion_2_second_login_reuses_the_user_row`](file:///Users/negro/hworkspace/projects/kambi/api/tests/test_auth.py#L37) | PASÓ |
| | [`test_criterion_2_no_table_stores_google_tokens`](file:///Users/negro/hworkspace/projects/kambi/api/tests/test_auth.py#L51) | PASÓ |
| | [`test_criterion_2_wrong_state_returns_400_without_session`](file:///Users/negro/hworkspace/projects/kambi/api/tests/test_auth.py#L67) | PASÓ |
| | [`test_criterion_2_callback_without_login_cookie_returns_400`](file:///Users/negro/hworkspace/projects/kambi/api/tests/test_auth.py#L80) | PASÓ |
| | [`test_criterion_2_callback_without_code_returns_400`](file:///Users/negro/hworkspace/projects/kambi/api/tests/test_auth.py#L89) | PASÓ |
| | [`test_criterion_2_callback_without_state_returns_400`](file:///Users/negro/hworkspace/projects/kambi/api/tests/test_auth.py#L97) | PASÓ |
| | [`test_criterion_2_tampered_login_cookie_returns_400`](file:///Users/negro/hworkspace/projects/kambi/api/tests/test_auth.py#L105) | PASÓ |
| | [`test_criterion_2_wrong_nonce_returns_400_without_session`](file:///Users/negro/hworkspace/projects/kambi/api/tests/test_auth.py#L116) | PASÓ |
| | [`test_criterion_2_provider_error_returns_400`](file:///Users/negro/hworkspace/projects/kambi/api/tests/test_auth.py#L128) | PASÓ |
| | [`test_criterion_2_secure_cookie_flag_comes_from_settings`](file:///Users/negro/hworkspace/projects/kambi/api/tests/test_auth.py#L139) | PASÓ |
| **3. Anonymous requests, logout and CSRF** | [`test_criterion_3_anonymous_requests_get_401`](file:///Users/negro/hworkspace/projects/kambi/api/tests/test_auth.py#L178) *(20 endpoints)* | PASÓ |
| | [`test_criterion_3_invalid_session_cookie_gets_401`](file:///Users/negro/hworkspace/projects/kambi/api/tests/test_auth.py#L185) | PASÓ |
| | [`test_criterion_3_expired_session_cookie_gets_401`](file:///Users/negro/hworkspace/projects/kambi/api/tests/test_auth.py#L191) | PASÓ |
| | [`test_criterion_3_logout_invalidates_the_cookie`](file:///Users/negro/hworkspace/projects/kambi/api/tests/test_auth.py#L207) | PASÓ |
| | [`test_criterion_3_logout_without_session_is_harmless`](file:///Users/negro/hworkspace/projects/kambi/api/tests/test_auth.py#L219) | PASÓ |
| | [`test_criterion_3_mutations_without_csrf_header_get_403_and_change_nothing`](file:///Users/negro/hworkspace/projects/kambi/api/tests/test_auth.py#L223) | PASÓ |
| | [`test_criterion_3_anonymous_without_csrf_header_is_rejected`](file:///Users/negro/hworkspace/projects/kambi/api/tests/test_auth.py#L258) | PASÓ |
| **4. Create a board with defaults** | [`test_criterion_4_new_board_is_trimmed_and_gets_default_columns_and_type`](file:///Users/negro/hworkspace/projects/kambi/api/tests/test_boards.py#L11) | PASÓ |
| | [`test_criterion_4_failed_seeding_leaves_no_rows`](file:///Users/negro/hworkspace/projects/kambi/api/tests/test_boards.py#L22) | PASÓ |
| **5. Rename, list and delete a board** | [`test_criterion_5_rename_increments_version`](file:///Users/negro/hworkspace/projects/kambi/api/tests/test_boards.py#L38) | PASÓ |
| | [`test_criterion_5_invalid_board_names_return_422`](file:///Users/negro/hworkspace/projects/kambi/api/tests/test_boards.py#L50) *(vacío, espacios, >100 chars)* | PASÓ |
| | [`test_criterion_5_name_of_100_chars_after_trim_is_valid`](file:///Users/negro/hworkspace/projects/kambi/api/tests/test_boards.py#L58) | PASÓ |
| | [`test_criterion_5_delete_removes_every_row_of_the_board`](file:///Users/negro/hworkspace/projects/kambi/api/tests/test_boards.py#L62) | PASÓ |
| | [`test_criterion_5_list_returns_only_the_callers_boards`](file:///Users/negro/hworkspace/projects/kambi/api/tests/test_boards.py#L87) | PASÓ |
| **6. Per-user isolation** | [`test_criterion_6_foreign_entities_in_the_path_return_404`](file:///Users/negro/hworkspace/projects/kambi/api/tests/test_isolation.py#L112) *(17 endpoints en path)* | PASÓ |
| | [`test_criterion_6_foreign_ids_in_body_or_query_return_422`](file:///Users/negro/hworkspace/projects/kambi/api/tests/test_isolation.py#L124) *(8 parámetros en body/query)* | PASÓ |
| **7. Optimistic versioning** | [`test_criterion_7_stale_version_returns_409_and_current_one_succeeds`](file:///Users/negro/hworkspace/projects/kambi/api/tests/test_versioning.py#L78) *(11 acciones en board, col, tipo, card)* | PASÓ |
| | [`test_criterion_7_restore_checks_the_version`](file:///Users/negro/hworkspace/projects/kambi/api/tests/test_versioning.py#L95) | PASÓ |
| | [`test_criterion_7_version_must_be_positive`](file:///Users/negro/hworkspace/projects/kambi/api/tests/test_versioning.py#L107) | PASÓ |
| | [`test_criterion_7_future_version_returns_409`](file:///Users/negro/hworkspace/projects/kambi/api/tests/test_versioning.py#L113) | PASÓ |
| **8. Fractional ordering** | [`test_criterion_8_key_between_sorts_strictly_between_neighbors`](file:///Users/negro/hworkspace/projects/kambi/api/tests/test_ordering.py#L22) | PASÓ |
| | [`test_criterion_8_fifty_inserts_at_the_same_position`](file:///Users/negro/hworkspace/projects/kambi/api/tests/test_ordering.py#L33) *(first, last, gap-low, gap-high)* | PASÓ |
| | [`test_criterion_8_random_inserts_match_postgres_c_collation`](file:///Users/negro/hworkspace/projects/kambi/api/tests/test_ordering.py#L56) *(300 inserciones)* | PASÓ |
| | [`test_criterion_8_sort_key_columns_use_the_c_collation`](file:///Users/negro/hworkspace/projects/kambi/api/tests/test_ordering.py#L72) | PASÓ |
| | [`test_criterion_8_keys_after_and_anchor_helpers`](file:///Users/negro/hworkspace/projects/kambi/api/tests/test_ordering.py#L84) | PASÓ |
| | [`test_criterion_8_invalid_keys_are_rejected`](file:///Users/negro/hworkspace/projects/kambi/api/tests/test_ordering.py#L97) *(5 casos de claves malformadas)* | PASÓ |
| | [`test_criterion_8_moving_a_column_changes_exactly_one_row`](file:///Users/negro/hworkspace/projects/kambi/api/tests/test_ordering.py#L102) | PASÓ |
| | [`test_criterion_8_moving_a_column_after_another_changes_exactly_one_row`](file:///Users/negro/hworkspace/projects/kambi/api/tests/test_ordering.py#L117) | PASÓ |
| | [`test_criterion_8_moving_a_card_changes_sort_key_of_exactly_one_row`](file:///Users/negro/hworkspace/projects/kambi/api/tests/test_ordering.py#L133) | PASÓ |
| **9. Columns: create, rename, move** | [`test_criterion_9_column_created_after_to_do_is_second`](file:///Users/negro/hworkspace/projects/kambi/api/tests/test_columns.py#L18) | PASÓ |
| | [`test_criterion_9_column_without_after_id_is_appended_and_null_is_first`](file:///Users/negro/hworkspace/projects/kambi/api/tests/test_columns.py#L26) | PASÓ |
| | [`test_criterion_9_rename_follows_the_name_rule`](file:///Users/negro/hworkspace/projects/kambi/api/tests/test_columns.py#L35) | PASÓ |
| | [`test_criterion_9_invalid_column_names_return_422`](file:///Users/negro/hworkspace/projects/kambi/api/tests/test_columns.py#L49) *(vacío, espacios, >100 chars)* | PASÓ |
| | [`test_criterion_9_name_of_100_chars_after_trim_is_valid`](file:///Users/negro/hworkspace/projects/kambi/api/tests/test_columns.py#L54) | PASÓ |
| | [`test_criterion_9_move_to_the_end_persists`](file:///Users/negro/hworkspace/projects/kambi/api/tests/test_columns.py#L59) | PASÓ |
| | [`test_criterion_9_move_after_itself_or_unknown_column_returns_422`](file:///Users/negro/hworkspace/projects/kambi/api/tests/test_columns.py#L69) | PASÓ |
| **10. Archive and restore a column** | [`test_criterion_10_archived_column_and_cards_move_to_the_archive`](file:///Users/negro/hworkspace/projects/kambi/api/tests/test_columns.py#L91) | PASÓ |
| | [`test_criterion_10_cards_in_an_archived_column_are_read_only`](file:///Users/negro/hworkspace/projects/kambi/api/tests/test_columns.py#L106) *(9 mutaciones prohibidas)* | PASÓ |
| | [`test_criterion_10_restore_brings_back_column_and_cards_untouched`](file:///Users/negro/hworkspace/projects/kambi/api/tests/test_columns.py#L140) | PASÓ |
| | [`test_criterion_10_restoring_an_active_column_returns_422`](file:///Users/negro/hworkspace/projects/kambi/api/tests/test_columns.py#L169) | PASÓ |
| | [`test_criterion_10_creating_column_after_archived_column_returns_422`](file:///Users/negro/hworkspace/projects/kambi/api/tests/test_columns.py#L175) | PASÓ |
| | [`test_criterion_10_new_columns_never_reuse_an_archived_columns_key`](file:///Users/negro/hworkspace/projects/kambi/api/tests/test_columns.py#L188) | PASÓ |
| **11. Delete a column** | [`test_criterion_11_delete_moves_cards_to_the_end_of_target`](file:///Users/negro/hworkspace/projects/kambi/api/tests/test_columns.py#L210) | PASÓ |
| | [`test_criterion_11_delete_with_cards_delete_removes_them`](file:///Users/negro/hworkspace/projects/kambi/api/tests/test_columns.py#L225) | PASÓ |
| | [`test_criterion_11_invalid_delete_requests_return_422_and_change_nothing`](file:///Users/negro/hworkspace/projects/kambi/api/tests/test_columns.py#L238) *(6 combinaciones inválidas)* | PASÓ |
| | [`test_criterion_11_empty_column_is_deleted_without_parameters`](file:///Users/negro/hworkspace/projects/kambi/api/tests/test_columns.py#L263) | PASÓ |
| | [`test_criterion_11_archived_column_can_be_deleted_from_the_archive`](file:///Users/negro/hworkspace/projects/kambi/api/tests/test_columns.py#L272) | PASÓ |
| **12. The last active column is protected** | [`test_criterion_12_last_active_column_cannot_be_deleted_or_archived`](file:///Users/negro/hworkspace/projects/kambi/api/tests/test_columns.py#L288) | PASÓ |
| **13. Card types** | [`test_criterion_13_new_type_is_listed_after_task`](file:///Users/negro/hworkspace/projects/kambi/api/tests/test_card_types.py#L15) | PASÓ |
| | [`test_criterion_13_rename_and_recolor_are_reflected_in_the_board`](file:///Users/negro/hworkspace/projects/kambi/api/tests/test_card_types.py#L23) | PASÓ |
| | [`test_criterion_13_renaming_a_type_to_its_own_name_in_another_case_is_allowed`](file:///Users/negro/hworkspace/projects/kambi/api/tests/test_card_types.py#L36) | PASÓ |
| | [`test_criterion_13_every_palette_color_is_accepted`](file:///Users/negro/hworkspace/projects/kambi/api/tests/test_card_types.py#L47) *(10 colores)* | PASÓ |
| | [`test_criterion_13_name_of_50_chars_is_accepted`](file:///Users/negro/hworkspace/projects/kambi/api/tests/test_card_types.py#L52) | PASÓ |
| | [`test_criterion_13_invalid_types_return_422`](file:///Users/negro/hworkspace/projects/kambi/api/tests/test_card_types.py#L68) *(color fuera de paleta, vacío, >50 chars, duplicado case-insensitive)* | PASÓ |
| | [`test_criterion_13_invalid_type_updates_return_422`](file:///Users/negro/hworkspace/projects/kambi/api/tests/test_card_types.py#L81) *(nombre duplicado, vacío, >50 chars, color hex)* | PASÓ |
| **14. Delete a type** | [`test_criterion_14_delete_with_replacement_reassigns_every_card`](file:///Users/negro/hworkspace/projects/kambi/api/tests/test_card_types.py#L105) | PASÓ |
| | [`test_criterion_14_invalid_type_deletions_return_422_and_change_nothing`](file:///Users/negro/hworkspace/projects/kambi/api/tests/test_card_types.py#L124) *(sin reemplazo, replace consigo mismo, otro board)* | PASÓ |
| | [`test_criterion_14_the_last_type_cannot_be_deleted`](file:///Users/negro/hworkspace/projects/kambi/api/tests/test_card_types.py#L145) | PASÓ |
| | [`test_criterion_14_last_type_cannot_be_deleted_even_with_replace_with`](file:///Users/negro/hworkspace/projects/kambi/api/tests/test_card_types.py#L158) | PASÓ |
| | [`test_criterion_14_unused_type_is_deleted_without_parameters`](file:///Users/negro/hworkspace/projects/kambi/api/tests/test_card_types.py#L173) | PASÓ |
| **15. Card lifecycle** | [`test_criterion_15_new_card_is_trimmed_and_appended_with_the_first_type`](file:///Users/negro/hworkspace/projects/kambi/api/tests/test_cards.py#L14) | PASÓ |
| | [`test_criterion_15_edit_persists_title_description_and_type`](file:///Users/negro/hworkspace/projects/kambi/api/tests/test_cards.py#L31) | PASÓ |
| | [`test_criterion_15_invalid_cards_return_422`](file:///Users/negro/hworkspace/projects/kambi/api/tests/test_cards.py#L58) *(título vacío, espacios, >200 chars, desc >10,000 chars)* | PASÓ |
| | [`test_criterion_15_limits_are_inclusive`](file:///Users/negro/hworkspace/projects/kambi/api/tests/test_cards.py#L67) *(200 chars y 10,000 chars)* | PASÓ |
| | [`test_criterion_15_type_from_another_board_returns_422`](file:///Users/negro/hworkspace/projects/kambi/api/tests/test_cards.py#L76) | PASÓ |
| | [`test_criterion_15_unknown_type_id_returns_422`](file:///Users/negro/hworkspace/projects/kambi/api/tests/test_cards.py#L93) | PASÓ |
| | [`test_criterion_15_html_in_titles_is_stored_unchanged`](file:///Users/negro/hworkspace/projects/kambi/api/tests/test_cards.py#L107) | PASÓ |
| | [`test_criterion_15_delete_removes_the_card`](file:///Users/negro/hworkspace/projects/kambi/api/tests/test_cards.py#L118) | PASÓ |
| **16. Move a card between any columns** | [`test_criterion_16_move_after_a_card_updates_only_the_moved_row`](file:///Users/negro/hworkspace/projects/kambi/api/tests/test_cards.py#L136) | PASÓ |
| | [`test_criterion_16_moves_need_no_flow_validation`](file:///Users/negro/hworkspace/projects/kambi/api/tests/test_cards.py#L160) | PASÓ |
| | [`test_criterion_16_move_first_and_within_the_same_column`](file:///Users/negro/hworkspace/projects/kambi/api/tests/test_cards.py#L179) | PASÓ |
| | [`test_criterion_16_after_id_outside_the_target_column_returns_422`](file:///Users/negro/hworkspace/projects/kambi/api/tests/test_cards.py#L196) *(columna equivocada y después de sí misma)* | PASÓ |
| | [`test_criterion_16_move_to_empty_column_with_null_after_id`](file:///Users/negro/hworkspace/projects/kambi/api/tests/test_cards.py#L213) | PASÓ |
| | [`test_criterion_16_move_to_unknown_column_returns_422`](file:///Users/negro/hworkspace/projects/kambi/api/tests/test_cards.py#L229) | PASÓ |
| **17. Test database chain and coverage gate** | [`test_criterion_17_test_database_url_wins_over_every_starter`](file:///Users/negro/hworkspace/projects/kambi/api/tests/test_db_chain.py#L29) | PASÓ |
| | [`test_criterion_17_testcontainers_is_tried_before_pgserver`](file:///Users/negro/hworkspace/projects/kambi/api/tests/test_db_chain.py#L40) | PASÓ |
| | [`test_criterion_17_pgserver_is_used_when_docker_is_missing`](file:///Users/negro/hworkspace/projects/kambi/api/tests/test_db_chain.py#L54) | PASÓ |
| | [`test_criterion_17_no_backend_raises_with_every_reason`](file:///Users/negro/hworkspace/projects/kambi/api/tests/test_db_chain.py#L63) | PASÓ |
| | [`test_criterion_17_never_runs_against_sqlite`](file:///Users/negro/hworkspace/projects/kambi/api/tests/test_db_chain.py#L73) | PASÓ |
| | [`test_criterion_17_never_runs_against_the_development_database`](file:///Users/negro/hworkspace/projects/kambi/api/tests/test_db_chain.py#L78) | PASÓ |
| | [`test_criterion_17_default_chain_order`](file:///Users/negro/hworkspace/projects/kambi/api/tests/test_db_chain.py#L85) | PASÓ |
