// ===============================
//  SERVICES - SUPABASE AUTH & NOCODB
//  Arquivo centralizado para autenticação e integração com banco de dados
// ===============================

// ===============================
//  CONFIGURAÇÃO
// ===============================

// Supabase Auth
const SUPABASE_URL = 'https://ffpmfqqvxeuvjcgyjsen.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmcG1mcXF2eGV1dmpjZ3lqc2VuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NzE5OTgsImV4cCI6MjA4MTA0Nzk5OH0.XfcdBtF7aUnrsbDA_A4DEuX6KOvgOOa9bVvV2unYmJg';

// Supabase - tabela de finanças (nome igual ao script SQL)
const SUPABASE_FINANCE_TABLE = 'finance_data';

// NocoDB
const NOCODB_API_TOKEN = 'YXvXeKm4xqldUZIZxtwt8tslZxStu08SqXr2mOs_';
const NOCODB_BASE_URL = 'https://app.nocodb.com/api/v2/tables/mht7b7fomr6g2it/records';
const NOCODB_VIEW_ID = 'vwp00extw4gab91s';

/**
 * ============================================
 * SERVICE: SUPABASE AUTH
 * ============================================
 * Gerencia toda a autenticação via Supabase Auth
 * NUNCA armazena senhas - apenas gerencia tokens de sessão
 */

class SupabaseAuthService {
    constructor(url, anonKey) {
        this.url = url;
        this.anonKey = anonKey;
        this.client = null;
        this.initialized = false;
    }

    /**
     * Inicializa o cliente Supabase
     * @returns {boolean} true se inicializado com sucesso
     */
    async initialize() {
        if (this.initialized && this.client) {
            return true;
        }

        try {
            // Verificar se a biblioteca Supabase está disponível
            if (typeof window !== 'undefined' && window.supabase && window.supabase.createClient) {
                this.client = window.supabase.createClient(this.url, this.anonKey);
                this.initialized = true;
                console.log('✅ Supabase Auth inicializado com sucesso');
                return true;
            } else {
                console.warn('⚠️ Biblioteca Supabase não encontrada. Verifique se o script está carregado no HTML.');
                return false;
            }
        } catch (error) {
            console.error('❌ Erro ao inicializar Supabase:', error);
            return false;
        }
    }

    /**
     * Registra um novo usuário no Supabase Auth
     * @param {string} email - Email do usuário
     * @param {string} password - Senha do usuário
     * @param {string} nome - Nome do usuário (opcional)
     * @returns {Promise<{success: boolean, user: object|null, error: string|null}>}
     */
    async signUp(email, password, nome = 'Usuário') {
        if (!this.initialized) {
            await this.initialize();
        }

        if (!this.client) {
            return {
                success: false,
                user: null,
                error: 'Supabase não inicializado'
            };
        }

        try {
            // Configurar signUp com auto-confirmação (para desenvolvimento)
            // Em produção, você pode querer habilitar confirmação de email
            const { data, error } = await this.client.auth.signUp({
                email: email.trim(),
                password: password,
                options: {
                    data: {
                        nome: nome.trim()
                    },
                    // Auto-confirmar email (para desenvolvimento)
                    // Em produção, remova esta opção para exigir confirmação
                    emailRedirectTo: window.location.origin
                }
            });
            
            console.log('📧 Resposta do Supabase signUp:', {
                user: data?.user ? { id: data.user.id, email: data.user.email } : null,
                session: data?.session ? 'Sessão criada' : 'Sem sessão (requer confirmação)',
                error: error?.message
            });

            if (error) {
                console.error('❌ Erro ao registrar no Supabase:', error);
                return {
                    success: false,
                    user: null,
                    error: error.message
                };
            }

            if (data.user) {
                console.log('✅ Usuário registrado no Supabase Auth:', data.user.id);
                return {
                    success: true,
                    user: {
                        id: data.user.id, // UUID do Supabase
                        email: data.user.email,
                        nome: data.user.user_metadata?.nome || nome
                    },
                    error: null
                };
            }

            return {
                success: false,
                user: null,
                error: 'Nenhum usuário retornado do Supabase'
            };
        } catch (error) {
            console.error('❌ Erro ao fazer signUp:', error);
            return {
                success: false,
                user: null,
                error: error.message || 'Erro desconhecido'
            };
        }
    }

    /**
     * Autentica um usuário existente no Supabase Auth
     * @param {string} email - Email do usuário
     * @param {string} password - Senha do usuário
     * @returns {Promise<{success: boolean, user: object|null, error: string|null}>}
     */
    async signIn(email, password) {
        if (!this.initialized) {
            await this.initialize();
        }

        if (!this.client) {
            return {
                success: false,
                user: null,
                error: 'Supabase não inicializado'
            };
        }

        try {
            const { data, error } = await this.client.auth.signInWithPassword({
                email: email.trim(),
                password: password
            });

            if (error) {
                console.error('❌ Erro ao fazer login no Supabase:', error);
                return {
                    success: false,
                    user: null,
                    error: error.message
                };
            }

            if (data.user) {
                console.log('✅ Login realizado com sucesso:', data.user.id);
                return {
                    success: true,
                    user: {
                        id: data.user.id, // UUID do Supabase
                        email: data.user.email,
                        nome: data.user.user_metadata?.nome || data.user.email
                    },
                    error: null
                };
            }

            return {
                success: false,
                user: null,
                error: 'Nenhum usuário retornado'
            };
        } catch (error) {
            console.error('❌ Erro ao fazer signIn:', error);
            return {
                success: false,
                user: null,
                error: error.message || 'Erro desconhecido'
            };
        }
    }

    /**
     * Faz logout do usuário
     * @returns {Promise<{success: boolean, error: string|null}>}
     */
    async signOut() {
        if (!this.client) {
            return { success: true, error: null };
        }

        try {
            const { error } = await this.client.auth.signOut();
            if (error) {
                console.error('❌ Erro ao fazer logout:', error);
                return { success: false, error: error.message };
            }
            return { success: true, error: null };
        } catch (error) {
            console.error('❌ Erro ao fazer signOut:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Verifica se há uma sessão ativa
     * @returns {Promise<{success: boolean, user: object|null, error: string|null}>}
     */
    async getSession() {
        if (!this.initialized) {
            await this.initialize();
        }

        if (!this.client) {
            return {
                success: false,
                user: null,
                error: 'Supabase não inicializado'
            };
        }

        try {
            const { data: { session }, error } = await this.client.auth.getSession();
            
            if (error) {
                return {
                    success: false,
                    user: null,
                    error: error.message
                };
            }

            if (session && session.user) {
                return {
                    success: true,
                    user: {
                        id: session.user.id,
                        email: session.user.email,
                        nome: session.user.user_metadata?.nome || session.user.email
                    },
                    error: null
                };
            }

            return {
                success: false,
                user: null,
                error: 'Nenhuma sessão ativa'
            };
        } catch (error) {
            console.error('❌ Erro ao verificar sessão:', error);
            return {
                success: false,
                user: null,
                error: error.message
            };
        }
    }
}

/**
 * ============================================
 * SERVICE: SUPABASE FINANCE
 * ============================================
 * Armazena dados financeiros no banco do Supabase
 * NUNCA armazena senhas - apenas dados financeiros e perfil
 */

class SupabaseFinanceService {
    constructor(url, anonKey, tableName) {
        this.url = url;
        this.anonKey = anonKey;
        this.tableName = tableName;
        this.client = null;
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized && this.client) return true;
        try {
            if (typeof window !== 'undefined' && window.supabase && window.supabase.createClient) {
                this.client = window.supabase.createClient(this.url, this.anonKey);
                this.initialized = true;
                return true;
            }
            console.warn('⚠️ Biblioteca Supabase não encontrada para Finance Service.');
            return false;
        } catch (error) {
            console.error('❌ Erro ao inicializar Supabase Finance:', error);
            return false;
        }
    }

    async createFinanceProfile({ userId, email, nome }) {
        if (!await this.initialize() || !this.client) {
            return { success: false, data: null, error: 'Supabase não inicializado' };
        }
        try {
            const payload = {
                user_id: userId,
                email: email.trim(),
                nome: (nome || 'Usuário').trim(),
                transactions: [],
                faturas_parceladas: [],
                despesas_recorrentes: [],
                receitas_recorrentes: [],
                updated_at: new Date().toISOString()
            };
            const upsert = this.client
                .from(this.tableName)
                .upsert([payload], { onConflict: 'user_id' })
                .select();

            const { data, error } = upsert.maybeSingle ? await upsert.maybeSingle() : await upsert.single();
            if (error) {
                console.error('❌ Erro ao criar perfil financeiro no Supabase:', error);
                return { success: false, data: null, error: error.message };
            }
            return { success: true, data: data || payload, error: null };
        } catch (error) {
            console.error('❌ Erro ao createFinanceProfile:', error);
            return { success: false, data: null, error: error.message || 'Erro desconhecido' };
        }
    }

    async getFinanceByUserId(userId) {
        if (!await this.initialize() || !this.client) {
            return { success: false, data: null, error: 'Supabase não inicializado' };
        }
        try {
            const select = this.client
                .from(this.tableName)
                .select('*')
                .eq('user_id', userId);

            const { data, error } = select.maybeSingle ? await select.maybeSingle() : await select.single();
            if (error) {
                return { success: false, data: null, error: error.message };
            }
            if (!data) {
                return { success: false, data: null, error: 'Nenhum registro encontrado' };
            }

            const parseJson = (value) => {
                if (value === null || value === undefined) return [];
                if (typeof value === 'string') {
                    try { return JSON.parse(value); } catch (e) { console.warn('⚠️ Parse JSON falhou:', e); return []; }
                }
                return value;
            };

            // Colunas em snake_case no banco
            const faturas = parseJson(data.faturas_parceladas);
            const despesas = parseJson(data.despesas_recorrentes);
            const receitas = parseJson(data.receitas_recorrentes);
            const transactions = parseJson(data.transactions);

            return {
                success: true,
                data: {
                    email: data.email,
                    userId: data.user_id,
                    nome: data.nome,
                    transactions,
                    faturasParceladas: faturas,
                    despesasRecorrentes: despesas,
                    receitasRecorrentes: receitas,
                    updated_at: data.updated_at || data.created_at
                },
                error: null
            };
        } catch (error) {
            console.error('❌ Erro ao getFinanceByUserId:', error);
            return { success: false, data: null, error: error.message || 'Erro desconhecido' };
        }
    }

    async updateFinanceByUserId(userId, data) {
        if (!await this.initialize() || !this.client) {
            return { success: false, data: null, error: 'Supabase não inicializado' };
        }
        try {
            const encode = (value) => {
                if (value === undefined) return undefined;
                return typeof value === 'string' ? value : JSON.stringify(value ?? []);
            };

            const payload = {
                user_id: userId,
                updated_at: new Date().toISOString()
            };

            if (data.email !== undefined) payload.email = data.email;
            if (data.nome !== undefined) payload.nome = data.nome;
            if (data.transactions !== undefined) payload.transactions = encode(data.transactions);
            if (data.faturasParceladas !== undefined) payload.faturas_parceladas = encode(data.faturasParceladas);
            if (data.despesasRecorrentes !== undefined) payload.despesas_recorrentes = encode(data.despesasRecorrentes);
            if (data.receitasRecorrentes !== undefined) payload.receitas_recorrentes = encode(data.receitasRecorrentes);

            const upsert = this.client
                .from(this.tableName)
                .upsert([payload], { onConflict: 'user_id' })
                .select();

            const { data: result, error } = upsert.maybeSingle ? await upsert.maybeSingle() : await upsert.single();
            if (error) {
                console.error('❌ Erro ao atualizar dados financeiros (Supabase):', error);
                return { success: false, data: null, error: error.message };
            }
            return { success: true, data: result || payload, error: null };
        } catch (error) {
            console.error('❌ Erro ao updateFinanceByUserId:', error);
            return { success: false, data: null, error: error.message || 'Erro desconhecido' };
        }
    }
}

// ===============================
//  INSTÂNCIAS DOS SERVICES
// ===============================

// Service de Autenticação Supabase
const authService = new SupabaseAuthService(SUPABASE_URL, SUPABASE_ANON_KEY);

// Service de Dados Financeiros no Supabase
const financeService = new SupabaseFinanceService(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    SUPABASE_FINANCE_TABLE
);

