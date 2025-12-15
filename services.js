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
 * SERVICE: NOCODB FINANCE
 * ============================================
 * Gerencia dados financeiros no NocoDB
 * NUNCA armazena senhas - apenas dados financeiros e perfil
 */

class NocoDBFinanceService {
    constructor(baseUrl, apiToken, viewId) {
        this.baseUrl = baseUrl;
        this.apiToken = apiToken;
        this.viewId = viewId;
    }

    /**
     * Cria um perfil financeiro inicial para um usuário
     * @param {object} profile - Dados do perfil
     * @param {string} profile.userId - UUID do Supabase Auth
     * @param {string} profile.email - Email do usuário
     * @param {string} profile.nome - Nome do usuário
     * @returns {Promise<{success: boolean, data: object|null, error: string|null}>}
     */
    async createFinanceProfile({ userId, email, nome }) {
        try {
            // Estrutura de dados financeiros inicial (vazia)
            const financeData = {
                transactions: [],
                faturasParceladas: [],
                despesasRecorrentes: [],
                receitasRecorrentes: [],
                updated_at: new Date().toISOString()
            };

            const recordData = {
                Email: email.trim(),
                UserId: userId, // UUID do Supabase Auth
                nome: nome.trim() || 'Usuário',
                FaturasParceladas: JSON.stringify([]),
                DespesasRecorrentes: JSON.stringify([]),
                ReceitasRecorrentes: JSON.stringify([])
                // created_at será auto-gerado pelo NocoDB
                // NUNCA incluir Password aqui!
            };

            const params = new URLSearchParams({
                offset: '0',
                limit: '25',
                where: '',
                viewId: this.viewId
            });

            const url = `${this.baseUrl}?${params.toString()}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'xc-token': this.apiToken,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(recordData)
            });

            if (response.ok) {
                const data = await response.json();
                console.log('✅ Perfil financeiro criado no NocoDB');
                return {
                    success: true,
                    data: data,
                    error: null
                };
            } else {
                const errorText = await response.text();
                console.error('❌ Erro ao criar perfil financeiro:', errorText);
                return {
                    success: false,
                    data: null,
                    error: `HTTP ${response.status}: ${errorText}`
                };
            }
        } catch (error) {
            console.error('❌ Erro ao criar perfil financeiro:', error);
            return {
                success: false,
                data: null,
                error: error.message || 'Erro desconhecido'
            };
        }
    }

    /**
     * Busca dados financeiros de um usuário pelo UserId (UUID do Supabase)
     * @param {string} userId - UUID do Supabase Auth
     * @returns {Promise<{success: boolean, data: object|null, error: string|null}>}
     */
    async getFinanceByUserId(userId) {
        try {
            const userIdSearch = encodeURIComponent(userId);
            const params = new URLSearchParams({
                offset: '0',
                limit: '25',
                where: `(UserId,eq,${userIdSearch})`,
                viewId: this.viewId
            });

            const url = `${this.baseUrl}?${params.toString()}`;
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'xc-token': this.apiToken,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const result = await response.json();
                const records = result.list || result.records || [];

                if (records.length > 0) {
                    const record = records[0];
                    
                    // Parse dos dados JSON
                    const faturas = record.FaturasParceladas 
                        ? (typeof record.FaturasParceladas === 'string' 
                            ? JSON.parse(record.FaturasParceladas) 
                            : record.FaturasParceladas)
                        : [];
                    
                    const despesas = record.DespesasRecorrentes
                        ? (typeof record.DespesasRecorrentes === 'string'
                            ? JSON.parse(record.DespesasRecorrentes)
                            : record.DespesasRecorrentes)
                        : [];
                    
                    const receitas = record.ReceitasRecorrentes
                        ? (typeof record.ReceitasRecorrentes === 'string'
                            ? JSON.parse(record.ReceitasRecorrentes)
                            : record.ReceitasRecorrentes)
                        : [];

                    return {
                        success: true,
                        data: {
                            email: record.Email,
                            userId: record.UserId,
                            nome: record.nome || record.Nome,
                            faturasParceladas: faturas,
                            despesasRecorrentes: despesas,
                            receitasRecorrentes: receitas,
                            created_at: record.created_at
                        },
                        error: null
                    };
                } else {
                    return {
                        success: false,
                        data: null,
                        error: 'Nenhum registro encontrado'
                    };
                }
            } else {
                const errorText = await response.text();
                console.error('❌ Erro ao buscar dados financeiros:', errorText);
                return {
                    success: false,
                    data: null,
                    error: `HTTP ${response.status}: ${errorText}`
                };
            }
        } catch (error) {
            console.error('❌ Erro ao buscar dados financeiros:', error);
            return {
                success: false,
                data: null,
                error: error.message || 'Erro desconhecido'
            };
        }
    }

    /**
     * Atualiza dados financeiros de um usuário (PATCH - atualização parcial)
     * @param {string} userId - UUID do Supabase Auth
     * @param {object} data - Dados para atualizar
     * @param {array} [data.faturasParceladas] - Array de faturas parceladas
     * @param {array} [data.despesasRecorrentes] - Array de despesas recorrentes
     * @param {array} [data.receitasRecorrentes] - Array de receitas recorrentes
     * @returns {Promise<{success: boolean, data: object|null, error: string|null}>}
     */
    async updateFinanceByUserId(userId, data) {
        try {
            // Primeiro, buscar o registro existente para obter o ID
            const getResult = await this.getFinanceByUserId(userId);
            
            if (!getResult.success || !getResult.data) {
                return {
                    success: false,
                    data: null,
                    error: 'Registro não encontrado. Use createFinanceProfile primeiro.'
                };
            }

            // Buscar o ID do registro no NocoDB
            const userIdSearch = encodeURIComponent(userId);
            const params = new URLSearchParams({
                offset: '0',
                limit: '25',
                where: `(UserId,eq,${userIdSearch})`,
                viewId: this.viewId
            });

            const getUrl = `${this.baseUrl}?${params.toString()}`;
            const getResponse = await fetch(getUrl, {
                method: 'GET',
                headers: {
                    'xc-token': this.apiToken,
                    'Content-Type': 'application/json'
                }
            });

            if (!getResponse.ok) {
                return {
                    success: false,
                    data: null,
                    error: `Erro ao buscar registro: HTTP ${getResponse.status}`
                };
            }

            const getData = await getResponse.json();
            const records = getData.list || getData.records || [];

            if (records.length === 0) {
                return {
                    success: false,
                    data: null,
                    error: 'Registro não encontrado'
                };
            }

            const recordId = records[0].Id || records[0].id || records[0]._id;
            if (!recordId) {
                return {
                    success: false,
                    data: null,
                    error: 'ID do registro não encontrado'
                };
            }

            // Preparar dados para atualização (PATCH - apenas campos fornecidos)
            const updateData = {};
            
            if (data.faturasParceladas !== undefined) {
                updateData.FaturasParceladas = typeof data.faturasParceladas === 'string' 
                    ? data.faturasParceladas 
                    : JSON.stringify(data.faturasParceladas);
            }
            
            if (data.despesasRecorrentes !== undefined) {
                updateData.DespesasRecorrentes = typeof data.despesasRecorrentes === 'string'
                    ? data.despesasRecorrentes
                    : JSON.stringify(data.despesasRecorrentes);
            }
            
            if (data.receitasRecorrentes !== undefined) {
                updateData.ReceitasRecorrentes = typeof data.receitasRecorrentes === 'string'
                    ? data.receitasRecorrentes
                    : JSON.stringify(data.receitasRecorrentes);
            }

            if (data.nome !== undefined) {
                updateData.nome = data.nome;
            }

            // PATCH para atualização parcial
            const updateUrl = `${this.baseUrl}/${recordId}`;
            const updateResponse = await fetch(updateUrl, {
                method: 'PATCH',
                headers: {
                    'xc-token': this.apiToken,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updateData)
            });

            if (updateResponse.ok) {
                const updatedData = await updateResponse.json();
                console.log('✅ Dados financeiros atualizados no NocoDB');
                return {
                    success: true,
                    data: updatedData,
                    error: null
                };
            } else {
                const errorText = await updateResponse.text();
                console.error('❌ Erro ao atualizar dados financeiros:', errorText);
                return {
                    success: false,
                    data: null,
                    error: `HTTP ${updateResponse.status}: ${errorText}`
                };
            }
        } catch (error) {
            console.error('❌ Erro ao atualizar dados financeiros:', error);
            return {
                success: false,
                data: null,
                error: error.message || 'Erro desconhecido'
            };
        }
    }
}

// ===============================
//  INSTÂNCIAS DOS SERVICES
// ===============================

// Service de Autenticação Supabase
const authService = new SupabaseAuthService(SUPABASE_URL, SUPABASE_ANON_KEY);

// Service de Dados Financeiros NocoDB
const financeService = new NocoDBFinanceService(
    NOCODB_BASE_URL,
    NOCODB_API_TOKEN,
    NOCODB_VIEW_ID
);

