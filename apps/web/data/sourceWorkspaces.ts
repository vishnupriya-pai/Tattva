import type { StudySource } from '../types/thinkforge';

export const INITIAL_STUDY_SOURCES: StudySource[] = [
  // -------------------------------------------------------------
  // SOURCE 1: Transformers & Self-Attention Architecture (AIML)
  // -------------------------------------------------------------
  {
    id: 'source-transformers',
    title: 'Transformers & Self-Attention Architecture',
    category: 'AIML',
    sourceType: 'youtube',
    sourceTypeLabel: 'YouTube Masterclass + Paper',
    thumbnail: '/thumbnails/thumb_aiml_03.jpg',
    youtubeId: 'eMlx5fFNoYc',
    duration: '32:50',
    views: '2.1M views',
    channelName: 'takeUforward · Engineering AI',
    masteryScore: 84,
    masteryLevel: 'Advanced',
    lastStudied: 'Today, 10:15 AM',
    summary:
      'Complete first-principles breakdown of Query, Key, and Value projections, scaled dot-product matrix multiplication, and multi-head attention.',
    transcript: `Attention mechanisms have revolutionized deep learning by dispensing with recurrence and convolutions entirely. In traditional sequence transduction models based on recurrent neural networks (RNNs, LSTMs, GRUs), computation is factored along the sequential positions of input tokens. This inherently sequential nature precludes parallelization during training, imposing a critical computational bottleneck when training on large corpora.

The Transformer architecture, introduced by Vaswani et al. (2017) in "Attention Is All You Need", replaces sequential recurrence with Self-Attention. Self-attention relates different positions of a single sequence to compute a contextualized representation of that sequence.

Mathematical Mechanics of Scaled Dot-Product Attention:
Given an input sequence of vectors packed into matrix X, we project X into three distinct latent representation spaces using learned weight matrices:
- Queries: Q = X * W_Q (where W_Q has dimensions d_model x d_k)
- Keys:    K = X * W_K (where W_K has dimensions d_model x d_k)
- Values:  V = X * W_V (where W_V has dimensions d_model x d_v)

The compatibility score between query vector q_i and key vector k_j is computed as their dot product (q_i · k_j). In matrix form, computing all pairwise affinities yields the raw attention score matrix:
Scores = Q * K^T  (resulting in an N x N matrix for a sequence of length N)

The Softmax Scaling Factor (1 / √d_k):
If the components of Q and K are independent random variables with zero mean and unit variance, their dot product has a mean of 0 and a variance of d_k. For large projection dimensions d_k (such as 64 or 128), the magnitudes of the dot products grow large. Large inputs push the Softmax function into saturation regions with extremely small gradients, leading to vanishing gradient problems during backpropagation. To counter this, the dot products are divided by the square root of d_k:

Attention(Q, K, V) = softmax((Q * K^T) / √d_k) * V

Multi-Head Attention:
Instead of performing a single attention function with d_model-dimensional queries, keys, and values, Multi-Head Attention projects Queries, Keys, and Values h times with different, learned linear projections. Each head operates on a lower-dimensional subspace (d_k = d_model / h). This allows the model to jointly attend to information from different representation subspaces at different positions—for example, one head tracking syntactic subject-verb dependencies while another head attends to long-distance co-references.

Positional Encoding:
Because the self-attention operation is permutation-equivariant (it performs set-based weighted sums without regard to order), the architecture lacks any inherent awareness of word order. To inject positional semantics, fixed sinusoidal positional encodings are added to the input embeddings:
PE(pos, 2i)   = sin(pos / 10000^(2i / d_model))
PE(pos, 2i+1) = cos(pos / 10000^(2i / d_model))

Quadratic Memory Bottleneck and Modern Hardware Acceleration:
Standard self-attention computes and materializes an explicit N x N attention score matrix in GPU High Bandwidth Memory (HBM). For sequence lengths exceeding 4,096 tokens, this quadratic O(N^2) memory footprint exceeds GPU memory limits. Modern architectures utilize FlashAttention (Dao et al.), which employs online softmax computation and on-chip SRAM tiling to evaluate attention blocks without ever materializing the quadratic N x N intermediate matrix in HBM.`,
    quizzes: [
      // Node 1: node-root-attention (Scaled Dot-Product Attention)
      {
        id: 'quiz-tf-01-a',
        question: 'In Scaled Dot-Product Attention, what mathematical operation evaluates the affinity between Query and Key tokens?',
        options: [
          'Cosine distance subtraction',
          'Inner product (Matrix multiplication of Q and transpose of K)',
          'Hadamard element-wise product',
          'Euclidean L2 norm distance'
        ],
        correctOptionIndex: 1,
        userSelectedIndex: 1,
        isAnsweredCorrectly: true,
        explanation: 'Pairwise compatibility between queries and keys is computed via the matrix product Q * K^T, producing unnormalized scalar affinity scores for all token pairs.',
        relatedConceptNodeId: 'node-root-attention'
      },
      {
        id: 'quiz-tf-01-b',
        question: 'Why does the self-attention mechanism require an explicit Softmax function along the rows of (Q * K^T)?',
        options: [
          'To invert the direction of the attention vectors',
          'To normalize raw scores into a valid probability distribution where each row sums to 1.0',
          'To discretize floating point values into 8-bit integers',
          'To force negative affinities to strictly positive infinity'
        ],
        correctOptionIndex: 1,
        userSelectedIndex: null,
        isAnsweredCorrectly: false,
        explanation: 'Applying softmax converts raw dot products into non-negative weights that sum to 1 across the sequence, allowing Value vectors to be combined as a convex combination.',
        relatedConceptNodeId: 'node-root-attention'
      },
      {
        id: 'quiz-tf-01-c',
        question: 'What is the role of the Value matrix V in the Attention(Q, K, V) formulation?',
        options: [
          'It acts as the lookup dictionary containing the contextual content to be weighted and retrieved',
          'It controls the learning rate during the backward pass',
          'It provides positional coordinates for sentence parsing',
          'It enforces orthogonality on the Query vectors'
        ],
        correctOptionIndex: 0,
        userSelectedIndex: null,
        isAnsweredCorrectly: false,
        explanation: 'The attention weights derived from Q and K determine how much weight to place on each token, while V holds the actual representation vectors being aggregated.',
        relatedConceptNodeId: 'node-root-attention'
      },
      {
        id: 'quiz-tf-01-d',
        question: 'What fundamentally differentiates Self-Attention from cross-attention in an encoder-decoder Transformer?',
        options: [
          'Self-attention operates only on integers, whereas cross-attention uses floating-point values',
          'In self-attention, Q, K, and V all originate from the same preceding layer, whereas in cross-attention, Q comes from the decoder and K, V come from the encoder',
          'Self-attention skips linear projection weights',
          'Cross-attention does not use the softmax function'
        ],
        correctOptionIndex: 1,
        userSelectedIndex: null,
        isAnsweredCorrectly: false,
        explanation: 'In self-attention, all three matrices originate from the same sequence. In cross-attention, queries come from the decoder sequence while keys and values come from the encoder sequence.',
        relatedConceptNodeId: 'node-root-attention'
      },

      // Node 2: node-qkv-projection (Q, K, V Linear Projections)
      {
        id: 'quiz-tf-02-a',
        question: 'Why does the Transformer project input tokens through three distinct projection matrices W_Q, W_K, and W_V rather than computing raw X * X^T?',
        options: [
          'To compress the input tokens into binary representations',
          'To decouple the role of a token as an interrogator (Query), a matchable target (Key), and a content carrier (Value)',
          'To eliminate the need for GPU matrix multiplication',
          'Because identical matrices would cause the determinant to become zero'
        ],
        correctOptionIndex: 1,
        userSelectedIndex: 1,
        isAnsweredCorrectly: true,
        explanation: 'Independent linear projections allow a word to query for specific semantic relationships while presenting different characteristics as a key and delivering different information as a value.',
        relatedConceptNodeId: 'node-qkv-projection'
      },
      {
        id: 'quiz-tf-02-b',
        question: 'If d_model = 512 and the model uses h = 8 attention heads, what is the standard dimensionality d_k of each individual head?',
        options: ['16', '32', '64', '128'],
        correctOptionIndex: 2,
        userSelectedIndex: null,
        isAnsweredCorrectly: false,
        explanation: 'In standard multi-head attention, d_k = d_model / h = 512 / 8 = 64 dimensions per head, keeping total computational cost equivalent to single-head attention with full dimensionality.',
        relatedConceptNodeId: 'node-qkv-projection'
      },
      {
        id: 'quiz-tf-02-c',
        question: 'What is the shape of projection matrix W_Q when projecting an embedding of dimension d_model into a key dimension d_k?',
        options: ['d_model x d_model', 'd_model x d_k', 'd_k x d_model', 'N x d_model'],
        correctOptionIndex: 1,
        userSelectedIndex: null,
        isAnsweredCorrectly: false,
        explanation: 'Multiplying an (N x d_model) input sequence by a (d_model x d_k) projection matrix produces an (N x d_k) matrix of projected queries.',
        relatedConceptNodeId: 'node-qkv-projection'
      },
      {
        id: 'quiz-tf-02-d',
        question: 'What happens to the final multi-head representations before passing into the Feed-Forward Network (FFN)?',
        options: [
          'They are averaged across all heads',
          'All head outputs are concatenated along the feature dimension and multiplied by output projection matrix W_O',
          'Only the head with the highest activation is retained',
          'They are element-wise multiplied by the original input matrix X'
        ],
        correctOptionIndex: 1,
        userSelectedIndex: null,
        isAnsweredCorrectly: false,
        explanation: 'The h head outputs of dimension d_v are concatenated to form an (N x d_model) matrix, which is then linearly projected by W_O (d_model x d_model).',
        relatedConceptNodeId: 'node-qkv-projection'
      },

      // Node 3: node-softmax-scaling (Softmax Variance Scaling 1 / sqrt(d_k))
      {
        id: 'quiz-tf-03-a',
        question: 'Why is the dot product of Query and Key scaled by 1 / sqrt(d_k) before applying Softmax?',
        options: [
          'To reduce floating-point hardware operations by 50%',
          'To prevent dot products from growing excessively large in high dimensions, which pushes softmax into vanishing gradient regions',
          'To enforce orthogonal unit vectors across attention heads',
          'To guarantee the attention matrix is strictly symmetric'
        ],
        correctOptionIndex: 1,
        userSelectedIndex: 1,
        isAnsweredCorrectly: true,
        explanation: 'When d_k is large, the variance of the dot product sum equals d_k. Scaling by 1/sqrt(d_k) normalizes variance back to 1.0, keeping softmax gradients steep and stable.',
        relatedConceptNodeId: 'node-softmax-scaling'
      },
      {
        id: 'quiz-tf-03-b',
        question: 'Under the assumption that elements of q and k are independent random variables with mean 0 and variance 1, what is the variance of their dot product q · k?',
        options: ['1', 'sqrt(d_k)', 'd_k', 'd_k^2'],
        correctOptionIndex: 2,
        userSelectedIndex: null,
        isAnsweredCorrectly: false,
        explanation: 'The dot product is the sum of d_k independent terms, each having variance 1 * 1 = 1. The variance of the sum of d_k independent variables is d_k.',
        relatedConceptNodeId: 'node-softmax-scaling'
      },
      {
        id: 'quiz-tf-03-c',
        question: 'What is the primary pathological symptom during training if the 1 / sqrt(d_k) scaling factor is omitted?',
        options: [
          'The attention map collapses to a uniform distribution',
          'The softmax outputs become one-hot vectors, and backpropagated gradients drop close to zero',
          'Loss functions report NaN due to matrix underflow',
          'The model swaps the positions of adjacent tokens'
        ],
        correctOptionIndex: 1,
        userSelectedIndex: null,
        isAnsweredCorrectly: false,
        explanation: 'Large magnitudes cause softmax to saturate: the maximum value receives almost 1.0 probability while others receive 0. The derivative of softmax at saturation is near zero, causing gradient vanishing.',
        relatedConceptNodeId: 'node-softmax-scaling'
      },
      {
        id: 'quiz-tf-03-d',
        question: 'Does additive attention (such as Bahdanau attention) require 1 / sqrt(d_k) scaling like dot-product attention?',
        options: [
          'Yes, additive attention also suffers identical variance scaling issues',
          'No, additive attention uses a feed-forward layer with tanh activation, but dot-product attention is faster and more space-efficient due to optimized BLAS matrix routines',
          'Additive attention only requires scaling when d_k < 16',
          'Additive attention scales by 1 / d_k^2 instead'
        ],
        correctOptionIndex: 1,
        userSelectedIndex: null,
        isAnsweredCorrectly: false,
        explanation: 'Additive attention does not scale quadratically with magnitude in the same way, but dot-product attention is vastly preferred in practice because it can be implemented with highly optimized matrix multiplication code.',
        relatedConceptNodeId: 'node-softmax-scaling'
      },

      // Node 4: node-quadratic-complexity (O(N^2) Complexity Bottleneck)
      {
        id: 'quiz-tf-04-a',
        question: 'What is the theoretical space and time complexity of standard self-attention over sequence length N?',
        options: [
          'O(N) linear complexity',
          'O(N log N) quasilinear complexity',
          'O(N^2) quadratic space and time complexity',
          'O(N^3) cubic tensor complexity'
        ],
        correctOptionIndex: 2,
        userSelectedIndex: 2,
        isAnsweredCorrectly: true,
        explanation: 'The attention score matrix Q * K^T requires computing pairwise affinities between all N tokens, producing an N x N matrix that consumes O(N^2) memory and FLOPs.',
        relatedConceptNodeId: 'node-quadratic-complexity'
      },
      {
        id: 'quiz-tf-04-b',
        question: 'How does FlashAttention avoid the quadratic memory bottleneck on GPU High Bandwidth Memory (HBM)?',
        options: [
          'By pruning 90% of token pairs using nearest neighbor clustering',
          'By tiling Query, Key, and Value blocks into SRAM and computing online softmax without materializing the full N x N matrix in HBM',
          'By converting all 32-bit floats into 1-bit binary representations',
          'By running attention exclusively on CPU cache lines'
        ],
        correctOptionIndex: 1,
        userSelectedIndex: 1,
        isAnsweredCorrectly: true,
        explanation: 'FlashAttention uses GPU SRAM tiling with an online softmax recomputation technique, reducing memory reads and writes from quadratic O(N^2) to sub-quadratic IO operations.',
        relatedConceptNodeId: 'node-quadratic-complexity'
      },
      {
        id: 'quiz-tf-04-c',
        question: 'Which hardware resource is the primary performance limiter when computing standard self-attention on modern GPUs?',
        options: [
          'Arithmetic tensor core computation (compute-bound)',
          'Memory bandwidth between High Bandwidth Memory (HBM) and on-chip SRAM (memory-bandwidth bound)',
          'PCIe bus transfer rate from host CPU',
          'L1 instruction cache misses'
        ],
        correctOptionIndex: 1,
        userSelectedIndex: null,
        isAnsweredCorrectly: false,
        explanation: 'Standard attention is memory-bound (memory bandwidth throttled), because reading and writing the intermediate N x N score matrix to HBM dominates total wall-clock execution time.',
        relatedConceptNodeId: 'node-quadratic-complexity'
      },
      {
        id: 'quiz-tf-04-d',
        question: 'Why do sub-quadratic linear attention approximations (like Performer or Linear Transformer) sometimes underperform on language modeling benchmarks compared to full attention?',
        options: [
          'They cannot run on NVIDIA GPUs',
          'Kernel approximations struggle with sharp, localized attention retrieval and associative memory tasks',
          'They have O(N^3) time complexity during inference',
          'They prevent the use of backpropagation'
        ],
        correctOptionIndex: 1,
        userSelectedIndex: null,
        isAnsweredCorrectly: false,
        explanation: 'Decomposing the softmax kernel often smooths out attention distributions, making it difficult for the model to precisely pinpoint and copy rare or isolated tokens across long contexts.',
        relatedConceptNodeId: 'node-quadratic-complexity'
      }
    ],
    notes: [
      {
        id: 'note-tf-01',
        title: 'Core Mechanics of Self-Attention',
        category: 'Core Mechanics',
        content: `**Mathematical Invariant:**
\\[
\\text{Attention}(Q, K, V) = \\text{softmax}\\left(\\frac{Q K^T}{\\sqrt{d_k}}\\right) V
\\]
- When \\(d_k\\) grows large, dot products grow proportionally to \\(d_k\\).
- Scaling by \\(1 / \\sqrt{d_k}\\) normalizes variance back to 1.0, preventing softmax saturation.`,
        updatedAt: '2 hours ago'
      }
    ],
    researchPaper: {
      title: 'Attention Is All You Need',
      authors: 'Ashish Vaswani, Noam Shazeer, Niki Parmar, Jakob Uszkoreit, Llion Jones, Aidan N. Gomez, Lukasz Kaiser, Illia Polosukhin',
      conference: 'NeurIPS 2017 (31st Conference on Neural Information Processing Systems)',
      year: 2017,
      arxivUrl: 'https://arxiv.org/abs/1706.03762',
      doiUrl: 'https://doi.org/10.48550/arXiv.1706.03762',
      abstract:
        'The dominant sequence transduction models are based on complex recurrent or convolutional neural networks that include an encoder and a decoder. The best performing models also connect the encoder and decoder through an attention mechanism. We propose a new simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely.',
      keyContributions: [
        'Elimination of recurrence and convolutional inductive bias in sequence modeling',
        'Introduction of multi-head scaled dot-product self-attention',
        'Massive parallelization enabling unprecedented scaling across sequence lengths and model parameters',
        'State-of-the-art BLEU scores with order-of-magnitude reduction in training wall-clock time'
      ],
      methodologicalBreakdown:
        'The Transformer relies entirely on self-attention to compute representations of input and output without using sequence-aligned RNNs or convolutions.'
    },
    knowledgeGraph: {
      rootNodeId: 'node-root-attention',
      nodes: [
        {
          id: 'node-root-attention',
          label: 'Scaled Dot-Product Attention',
          category: 'Core Architecture',
          depth: 1,
          status: 'mastered',
          importance: 'critical',
          summary: 'Fundamental mapping of a set of query, key, and value vectors to an output representation.',
          shortLine: 'Attention(Q,K,V) = softmax(QK^T / √d_k)V',
          keyFormula: 'Attention(Q, K, V) = softmax(Q K^T / √d_k) V',
          failureMode: 'Vanishing gradient saturation in softmax when variance of dot product grows without bound.',
          tier: 'macro',
          x: 280,
          y: 40
        },
        {
          id: 'node-qkv-projection',
          label: 'Q, K, V Linear Projections',
          category: 'Projections',
          depth: 2,
          status: 'mastered',
          importance: 'foundational',
          summary: 'Linear transformations of input representations into query, key, and value subspaces.',
          shortLine: 'Q = X·W_Q, K = X·W_K, V = X·W_V',
          keyFormula: 'Q = X W_Q, K = X W_K, V = X W_V',
          failureMode: 'Collinear or degenerate projections collapse attention into low-rank representations.',
          tier: 'standard',
          x: 120,
          y: 180
        },
        {
          id: 'node-softmax-scaling',
          label: 'Softmax Variance Scaling (1/√d_k)',
          category: 'Mathematical Stability',
          depth: 2,
          status: 'mastered',
          importance: 'critical',
          summary: 'Divisive normalization counteracting the growth of dot product variance in high dimensions.',
          shortLine: 'Variance normalization keeping gradients steep and non-zero',
          keyFormula: 'Var(q · k) = d_k  ⟹  Scaling by 1/√d_k yields Var = 1.0',
          failureMode: 'Omitting scaling pushes softmax into flat saturation zones where gradients vanish to 0.',
          tier: 'standard',
          x: 440,
          y: 180
        },
        {
          id: 'node-quadratic-complexity',
          label: 'O(N²) Quadratic Memory Bottleneck',
          category: 'Complexity Analysis',
          depth: 3,
          status: 'in_progress',
          importance: 'critical',
          summary: 'Pairwise token interactions require materializing an N x N attention matrix.',
          shortLine: 'O(N²) space & time scaling across sequence length',
          keyFormula: 'Memory = O(N² · h), FLOPs = O(N² · d)',
          failureMode: 'GPU High Bandwidth Memory (HBM) out-of-memory exhaustion on sequence lengths > 4K tokens.',
          tier: 'standard',
          x: 280,
          y: 320
        }
      ],
      edges: [
        { id: 'e-att-1', source: 'node-root-attention', target: 'node-qkv-projection', label: 'Projects Into' },
        { id: 'e-att-2', source: 'node-root-attention', target: 'node-softmax-scaling', label: 'Stabilizes Via' },
        { id: 'e-att-3', source: 'node-softmax-scaling', target: 'node-quadratic-complexity', label: 'Suffers From' }
      ]
    }
  },

  // -------------------------------------------------------------
  // SOURCE 2: Operating Systems: Semaphores, Mutex & Deadlocks (CS)
  // -------------------------------------------------------------
  {
    id: 'source-os-sync',
    title: 'Operating Systems: Semaphores, Mutex & Deadlocks',
    category: 'Computer Science',
    sourceType: 'system_design',
    sourceTypeLabel: 'Systems Core & Concurrency',
    thumbnail: '/thumbnails/thumb_cs_01.jpg',
    youtubeId: 'rNW_m3k20K8',
    duration: '44:10',
    views: '1.5M views',
    channelName: 'takeUforward · Systems Core',
    masteryScore: 82,
    masteryLevel: 'Proficient',
    lastStudied: 'Nov 9, 6:00 PM',
    summary:
      '44-minute rigorous breakdown of critical section conditions, counting semaphores, and Coffman deadlock conditions.',
    transcript: `Concurrency and process synchronization form the bedrock of modern multi-threaded operating systems. When multiple concurrent processes or threads share state or memory addresses, unsynchronized interleaving of instructions leads to race conditions—where the final output depends on the precise, non-deterministic order of thread scheduling.

The Critical Section Problem:
A critical section is a block of code where shared resources, such as memory buffers or file handles, are read or modified. Any mathematically sound synchronization mechanism must satisfy three fundamental criteria:
1. Mutual Exclusion: If a thread T_i is executing in its critical section, no other threads are permitted to execute in their critical sections simultaneously.
2. Progress: If no thread is executing in its critical section and there exist threads requesting entry, only those threads not executing in their remainder sections can participate in deciding who enters next, and this selection cannot be postponed indefinitely.
3. Bounded Waiting: There must exist a formal upper bound on the number of times other threads are granted access to their critical sections after a thread has posted its request and before that request is fulfilled, preventing thread starvation.

Dijkstra Semaphores (P & V Operations):
Introduced by Edsger Dijkstra in 1965, a semaphore S is an integer variable accessed exclusively through two atomic, indivisible operations:
- wait() or P(S) [from Dutch "proberen", to test]:
  Decrements S. If S becomes negative, the executing thread is suspended and appended to the semaphore's waiting queue.
- signal() or V(S) [from Dutch "verhogen", to increment]:
  Increments S. If S remains less than or equal to 0, an asleep thread is removed from the waiting queue and transitioned to the ready queue.

Unlike spinlocks (which busy-wait in a loop burning CPU cycles), blocking semaphores yield the processor, triggering a context switch until the resource is signaled. Binary semaphores (range 0 to 1) enforce mutual exclusion, while Counting semaphores manage finite resource pools (e.g., database connection pools).

The Deadlock Phenomenon and Coffman Conditions:
A deadlock is a permanent system state where every thread in a set is blocked waiting for a resource that can only be released by another thread in the same set. In 1971, Edward G. Coffman Jr. proved that a deadlock can arise if and only if all four of the following conditions hold simultaneously:
1. Mutual Exclusion: At least one resource is held in a non-shareable mode (exclusive access).
2. Hold and Wait: A thread currently holding at least one resource is actively waiting to acquire additional resources held by other threads.
3. No Preemption: Resources cannot be forcibly revoked from a thread; they can only be released voluntarily by the holding thread upon task completion.
4. Circular Wait: A closed chain of threads {T_0, T_1, ..., T_n} exists such that T_0 waits for a resource held by T_1, T_1 waits for T_2, and T_n waits for T_0.

Deadlock Avoidance & Dijkstra's Banker's Algorithm:
Rather than allowing deadlocks to occur and recovering after the fact, Deadlock Avoidance dynamically analyzes resource allocation state to ensure the system never transitions from a Safe State to an Unsafe State. A state is safe if there exists an execution sequence <T_1, T_2, ..., T_n> such that each thread T_i can satisfy its maximum remaining resource demands using the currently available resources plus the resources held by all preceding threads T_j (j < i). If a requested allocation leaves no safe sequence, the request is denied and the thread is blocked, guaranteeing deadlock immunity.`,
    quizzes: [
      // Node 1: node-root-sync (Process Synchronization & Concurrency)
      {
        id: 'quiz-os-01-a',
        question: 'Which of the following is NOT one of the three required criteria for a correct solution to the Critical Section problem?',
        options: [
          'Mutual Exclusion',
          'Progress',
          'Preemptive Priority Scheduling',
          'Bounded Waiting'
        ],
        correctOptionIndex: 2,
        userSelectedIndex: 2,
        isAnsweredCorrectly: true,
        explanation: 'The three formal criteria established by Dijkstra are Mutual Exclusion, Progress, and Bounded Waiting. Preemptive Priority Scheduling is a scheduling policy, not a correctness requirement.',
        relatedConceptNodeId: 'node-root-sync'
      },
      {
        id: 'quiz-os-01-b',
        question: 'What defines a Race Condition in concurrent systems?',
        options: [
          'A hardware clock skew between multi-core CPUs',
          'A situation where multiple threads read and write shared data, and the final outcome depends on the non-deterministic scheduling order of execution',
          'A thread running at 100% CPU utilization without yielding',
          'Two network sockets transmitting packets on the same port'
        ],
        correctOptionIndex: 1,
        userSelectedIndex: null,
        isAnsweredCorrectly: false,
        explanation: 'A race condition occurs when concurrent operations on shared state produce varying, inconsistent results depending on which thread executes first.',
        relatedConceptNodeId: 'node-root-sync'
      },
      {
        id: 'quiz-os-01-c',
        question: 'Why does disabling hardware interrupts fail as a general synchronization solution on modern multi-core systems?',
        options: [
          'Interrupts cannot be disabled in kernel mode',
          'Disabling interrupts on one CPU core does not prevent threads executing on other CPU cores from concurrently accessing shared memory',
          'Hardware timers immediately re-enable interrupts within 1 millisecond',
          'It causes memory leaks in cache memory'
        ],
        correctOptionIndex: 1,
        userSelectedIndex: null,
        isAnsweredCorrectly: false,
        explanation: 'Disabling interrupts affects only the local processor core where the instruction executes. Other cores continue running and can access the critical section concurrently.',
        relatedConceptNodeId: 'node-root-sync'
      },
      {
        id: 'quiz-os-01-d',
        question: 'What invariant is guaranteed by the Bounded Waiting condition?',
        options: [
          'Every process will finish executing within 100 milliseconds',
          'A requesting process will never wait indefinitely (starvation is prevented)',
          'All processes must enter the critical section in strict ascending order of PID',
          'The size of the critical section cannot exceed 4KB of RAM'
        ],
        correctOptionIndex: 1,
        userSelectedIndex: null,
        isAnsweredCorrectly: false,
        explanation: 'Bounded waiting ensures there is a limit on the number of times other processes can bypass a waiting process, mathematically eliminating starvation.',
        relatedConceptNodeId: 'node-root-sync'
      },

      // Node 2: node-semaphores (Dijkstra Semaphores P & V)
      {
        id: 'quiz-os-02-a',
        question: 'What is the key behavioral difference between a blocking Semaphore and a Spinlock (busy-wait)?',
        options: [
          'Spinlocks are implemented in software, while semaphores are purely analog circuits',
          'A spinlock loops continuously on CPU checking the condition, whereas a blocking semaphore puts the thread to sleep and yields the CPU',
          'Semaphores cannot be used for mutual exclusion',
          'Spinlocks can hold negative integer values'
        ],
        correctOptionIndex: 1,
        userSelectedIndex: 1,
        isAnsweredCorrectly: true,
        explanation: 'Spinlocks burn CPU cycles while waiting in a loop. Blocking semaphores transition the thread to a sleep/waiting queue and invoke the scheduler, freeing the CPU for other tasks.',
        relatedConceptNodeId: 'node-semaphores'
      },
      {
        id: 'quiz-os-02-b',
        question: 'If a counting semaphore is initialized to S = 3, and 5 consecutive wait() (P) operations occur without any signal() operations, what is the value of S?',
        options: ['3', '0', '-2', '-5'],
        correctOptionIndex: 2,
        userSelectedIndex: null,
        isAnsweredCorrectly: false,
        explanation: 'Each wait() decrements S. 3 - 5 = -2. The negative magnitude |-2| indicates that 2 threads are currently suspended and waiting on the semaphore queue.',
        relatedConceptNodeId: 'node-semaphores'
      },
      {
        id: 'quiz-os-02-c',
        question: 'What atomic hardware primitive is commonly utilized in CPU instruction sets to implement mutual exclusion semaphores?',
        options: ['Test-and-Set / Compare-and-Swap (CAS)', 'Direct Memory Access (DMA)', 'Vector dot-product instruction', 'Branch Prediction Cache'],
        correctOptionIndex: 0,
        userSelectedIndex: null,
        isAnsweredCorrectly: false,
        explanation: 'Atomic read-modify-write instructions like Test-and-Set or Compare-and-Swap execute indivisibly at the hardware level, allowing locks to be acquired without race conditions.',
        relatedConceptNodeId: 'node-semaphores'
      },
      {
        id: 'quiz-os-02-d',
        question: 'What fatal concurrency bug occurs if a thread executes wait(S) inside its critical section and then crashes before executing signal(S)?',
        options: [
          'Memory leak in the kernel heap',
          'Permanent deadlock: all subsequent threads attempting to acquire S will block forever',
          'The OS kernel terminates all processes',
          'The semaphore automatically resets itself to 1 after 5 seconds'
        ],
        correctOptionIndex: 1,
        userSelectedIndex: null,
        isAnsweredCorrectly: false,
        explanation: 'If the lock is never signaled, S remains 0 or negative, causing all subsequent threads requesting the resource to block indefinitely.',
        relatedConceptNodeId: 'node-semaphores'
      },

      // Node 3: node-coffman (Coffman Deadlock Conditions)
      {
        id: 'quiz-os-03-a',
        question: 'Which of the following is NOT one of the 4 Coffman conditions required for a deadlock to occur?',
        options: [
          'Mutual Exclusion',
          'Hold and Wait',
          'Preemptive Scheduling',
          'Circular Wait'
        ],
        correctOptionIndex: 2,
        userSelectedIndex: 2,
        isAnsweredCorrectly: true,
        explanation: 'The 4 Coffman conditions are: Mutual Exclusion, Hold and Wait, No Preemption, and Circular Wait. Preemptive scheduling prevents deadlocks.',
        relatedConceptNodeId: 'node-coffman'
      },
      {
        id: 'quiz-os-03-b',
        question: 'How does Resource Hierarchy / Total Order Resource Ordering eliminate the Coffman Circular Wait condition?',
        options: [
          'By releasing all locks every 10 seconds',
          'By assigning each resource a unique integer ID and strictly requiring processes to request resources in ascending order of ID',
          'By banning the use of semaphores in user-space',
          'By allocating infinite memory to every process'
        ],
        correctOptionIndex: 1,
        userSelectedIndex: null,
        isAnsweredCorrectly: false,
        explanation: 'If every thread must acquire resources in strictly increasing order (e.g. must acquire R1 before R2), a circular chain of dependencies R1 -> R2 -> ... -> R1 is mathematically impossible.',
        relatedConceptNodeId: 'node-coffman'
      },
      {
        id: 'quiz-os-03-c',
        question: 'In a Resource Allocation Graph (RAG), if the graph contains a cycle and all resource types have exactly ONE instance, what does this imply?',
        options: [
          'Deadlock is possible but not guaranteed',
          'A deadlock definitely exists',
          'The system is guaranteed safe',
          'The operating system will crash immediately'
        ],
        correctOptionIndex: 1,
        userSelectedIndex: null,
        isAnsweredCorrectly: false,
        explanation: 'When every resource has only a single instance, a cycle in the Resource Allocation Graph is both a necessary AND sufficient condition for deadlock.',
        relatedConceptNodeId: 'node-coffman'
      },
      {
        id: 'quiz-os-03-d',
        question: 'Which Coffman condition is invalidated if a system forcibly takes away resources from a thread when another high-priority thread requests them?',
        options: ['Mutual Exclusion', 'Hold and Wait', 'No Preemption', 'Circular Wait'],
        correctOptionIndex: 2,
        userSelectedIndex: null,
        isAnsweredCorrectly: false,
        explanation: 'Preempting (forcibly reclaiming) allocated resources breaks the "No Preemption" condition, preventing circular deadlock states.',
        relatedConceptNodeId: 'node-coffman'
      },

      // Node 4: node-banker (Banker's Algorithm for Avoidance)
      {
        id: 'quiz-os-04-a',
        question: 'What is the fundamental objective of Dijkstra\'s Banker\'s Algorithm in OS resource management?',
        options: [
          'To detect and terminate deadlocked processes after they freeze',
          'To dynamically analyze resource requests and guarantee the system never transitions into an Unsafe State',
          'To balance network traffic across internet gateways',
          'To allocate swap space on SSD storage'
        ],
        correctOptionIndex: 1,
        userSelectedIndex: 1,
        isAnsweredCorrectly: true,
        explanation: 'The Banker\'s algorithm performs safety simulations before granting resource allocations, ensuring a safe sequence always exists.',
        relatedConceptNodeId: 'node-banker'
      },
      {
        id: 'quiz-os-04-b',
        question: 'Does an "Unsafe State" in the Banker\'s Algorithm guarantee that a deadlock has already occurred?',
        options: [
          'Yes, an unsafe state is mathematically identical to a deadlock',
          'No, an unsafe state is NOT deadlocked yet, but the OS can no longer prevent processes from potentially deadlocking if they all request their maximum claims',
          'Unsafe states only happen during CPU hardware failures',
          'Unsafe states automatically resolve within 1 cycle'
        ],
        correctOptionIndex: 1,
        userSelectedIndex: null,
        isAnsweredCorrectly: false,
        explanation: 'All deadlocks are unsafe states, but not all unsafe states are deadlocked. An unsafe state simply means the OS cannot guarantee avoidance if processes make maximal requests.',
        relatedConceptNodeId: 'node-banker'
      },
      {
        id: 'quiz-os-04-c',
        question: 'What prerequisite knowledge does the Banker\'s Algorithm strictly require about every process prior to execution?',
        options: [
          'The process\'s priority rank',
          'The exact maximum number of resources of each type that the process will claim during its lifecycle',
          'The total number of CPU clock cycles needed for execution',
          'The PID assigned by the kernel'
        ],
        correctOptionIndex: 1,
        userSelectedIndex: null,
        isAnsweredCorrectly: false,
        explanation: 'Banker\'s algorithm relies on knowing the a priori maximum demand vector (Max[i]) for every process, which is why it is difficult to implement in general-purpose interactive operating systems.',
        relatedConceptNodeId: 'node-banker'
      },
      {
        id: 'quiz-os-04-d',
        question: 'In the Banker\'s Algorithm Safety verification loop, what is the formula for the remaining resource need of process P_i?',
        options: ['Need[i] = Max[i] - Allocation[i]', 'Need[i] = Available + Allocation[i]', 'Need[i] = Max[i] / Available', 'Need[i] = Allocation[i] - Max[i]'],
        correctOptionIndex: 0,
        userSelectedIndex: null,
        isAnsweredCorrectly: false,
        explanation: 'Need represents the remaining resources process i could still request, calculated as its declared maximum minus its current allocation.',
        relatedConceptNodeId: 'node-banker'
      }
    ],
    notes: [
      {
        id: 'note-os-01',
        title: 'Semaphore Primitive Operations',
        category: 'Core Mechanics',
        content: `**Wait() [P operation / down]:**
\`\`\`c
void wait(Semaphore S) {
  S.value--;
  if (S.value < 0) {
    // Add this thread to S.queue
    block();
  }
}
\`\`\`

**Signal() [V operation / up]:**
\`\`\`c
void signal(Semaphore S) {
  S.value++;
  if (S.value <= 0) {
    // Remove thread P from S.queue
    wakeup(P);
  }
}
\`\`\``,
        updatedAt: 'Nov 9, 2026'
      }
    ],
    researchPaper: {
      title: 'Cooperating Sequential Processes',
      authors: 'Edsger W. Dijkstra',
      conference: 'Technological University Eindhoven (Reprinted in Programming Languages, Academic Press)',
      year: 1965,
      arxivUrl: 'https://www.cs.utexas.edu/users/EWD/ewd01xx/EWD123.PDF',
      doiUrl: 'https://dl.acm.org/doi/10.1145/362929.362947',
      abstract:
        'In this monograph Dijkstra introduces the seminal concepts of concurrent programming, mutual exclusion, the critical section problem, and the invention of semaphores (P and V operations). It establishes the formal mathematical basis for multi-processing coordination.',
      keyContributions: [
        'Invention of the semaphore synchronization primitive (P and V operations)',
        'Formal definition of the Critical Section problem and race conditions',
        'Mathematical proof of mutual exclusion without busy-waiting (Peterson & Dijkstra algorithms)',
        'Analysis of resource contention and deadlocks'
      ],
      methodologicalBreakdown:
        'Dijkstra structures concurrent execution into discrete sequential processes communicating exclusively via atomic synchronization primitives.'
    },
    knowledgeGraph: {
      rootNodeId: 'node-root-sync',
      nodes: [
        {
          id: 'node-root-sync',
          label: 'Process Synchronization & Concurrency',
          category: 'Operating Systems',
          depth: 1,
          status: 'mastered',
          importance: 'critical',
          summary: 'Techniques ensuring shared resources are accessed safely by concurrent threads.',
          shortLine: 'Mutual Exclusion, Progress & Bounded Waiting invariants',
          keyFormula: 'Race Condition ⟹ Undefined Output State',
          failureMode: 'Data corruption due to unsynchronized concurrent read-modify-write operations.',
          tier: 'macro',
          x: 280,
          y: 40
        },
        {
          id: 'node-semaphores',
          label: 'Dijkstra Semaphores (P & V)',
          category: 'Synchronization Primitives',
          depth: 2,
          status: 'mastered',
          importance: 'critical',
          summary: 'Atomic integer primitives with wait() and signal() for thread coordination.',
          shortLine: 'P(S) decrements and blocks; V(S) increments and wakes',
          keyFormula: 'P(S): S-- < 0 ⟹ block(); V(S): S++ <= 0 ⟹ wakeup()',
          failureMode: 'Deadlock if a thread exits or crashes without executing signal(S).',
          tier: 'standard',
          x: 120,
          y: 180
        },
        {
          id: 'node-coffman',
          label: 'Coffman Deadlock Conditions',
          category: 'Failure Modes',
          depth: 2,
          status: 'mastered',
          importance: 'critical',
          summary: 'Four simultaneous conditions that are necessary and sufficient for deadlocks.',
          shortLine: 'Mutual Exclusion, Hold & Wait, No Preemption, Circular Wait',
          keyFormula: 'Deadlock ⟺ ME ∧ HW ∧ NP ∧ CW',
          failureMode: 'System halt where all threads in dependency chain sleep indefinitely.',
          tier: 'standard',
          x: 440,
          y: 180
        },
        {
          id: 'node-banker',
          label: 'Banker Algorithm for Avoidance',
          category: 'Deadlock Avoidance',
          depth: 3,
          status: 'in_progress',
          importance: 'advanced',
          summary: 'Simulates allocation to guarantee system remains in safe states.',
          shortLine: 'Safety sequence simulation before granting resource request',
          keyFormula: 'Need[i] = Max[i] - Alloc[i] <= Available',
          failureMode: 'Unsafe state transition leading to unresolvable resource starvation.',
          tier: 'standard',
          x: 280,
          y: 320
        }
      ],
      edges: [
        { id: 'e-os-1', source: 'node-root-sync', target: 'node-semaphores', label: 'Solved Via' },
        { id: 'e-os-2', source: 'node-root-sync', target: 'node-coffman', label: 'Vulnerable To' },
        { id: 'e-os-3', source: 'node-coffman', target: 'node-banker', label: 'Prevented By' }
      ]
    }
  },

  // -------------------------------------------------------------
  // SOURCE 3: Public Key Cryptography & Diffie-Hellman Key Exchange (Cybersecurity)
  // -------------------------------------------------------------
  {
    id: 'source-rsa-crypto',
    title: 'Public Key Cryptography & Diffie-Hellman Key Exchange',
    category: 'Cybersecurity',
    sourceType: 'youtube',
    sourceTypeLabel: 'CyberDefense & Cryptography',
    thumbnail: '/thumbnails/thumb_cyber_02.jpg',
    youtubeId: 'NmM9HA2MQGI',
    duration: '35:20',
    views: '890K views',
    channelName: 'takeUforward · CyberDefense',
    masteryScore: 78,
    masteryLevel: 'Proficient',
    lastStudied: 'Nov 11, 2:10 PM',
    summary:
      '35-minute mathematical intuition exploring modular arithmetic, discrete logarithms, and forward secrecy in modern TLS.',
    transcript: `The invention of Public Key Cryptography by Whitfield Diffie and Martin Hellman in 1976 transformed secure digital communication. Prior to Diffie-Hellman, secure communication required a shared symmetric key to be delivered beforehand through a physically secure courier or pre-established trusted channel.

Diffie-Hellman Key Exchange Protocol:
Diffie-Hellman enables two communicating parties, Alice and Bob, to establish a shared symmetric secret over an insecure, publicly eavesdropped communication channel without transmitting the secret itself.

Mathematical Foundation in Modular Arithmetic:
1. Public Domain Parameters:
   Alice and Bob publicly agree on a large prime modulus p and a generator g (a primitive root modulo p). These values are publicly known to adversaries.
2. Private Secret Generation:
   - Alice picks a private random integer a (where 1 < a < p - 1).
   - Bob picks a private random integer b (where 1 < b < p - 1).
3. Public Value Transmission:
   - Alice computes public key A = g^a mod p and sends A to Bob over the public channel.
   - Bob computes public key B = g^b mod p and sends B to Alice over the public channel.
4. Shared Secret Derivation:
   - Alice computes: K_Alice = B^a mod p = (g^b)^a mod p = g^(ab) mod p
   - Bob computes:   K_Bob   = A^b mod p = (g^a)^b mod p = g^(ab) mod p
Both parties arrive at the identical cryptographic key K = g^(ab) mod p without ever sending a, b, or K over the wire.

The Discrete Logarithm Hardness Assumption (DLP):
An adversary listening on the channel observes p, g, A = g^a mod p, and B = g^b mod p. Computing K requires computing g^(ab) mod p, known as the Computational Diffie-Hellman (CDH) problem. For classical computers, finding the private exponent a given g and g^a mod p requires solving the Discrete Logarithm Problem (DLP), which has no known polynomial-time classical solution for sufficiently large primes (e.g., 2048+ bits) or elliptic curve groups (ECDH over Curve25519 or NIST P-256).

Man-in-the-Middle (MitM) Vulnerability:
Standard, unauthenticated Diffie-Hellman is inherently vulnerable to active Man-in-the-Middle attacks. If Mallory intercepts Alice's public key A, she can substitute her own key M_A to Bob, and intercept Bob's key B and substitute M_B to Alice. Mallory establishes two separate shared secrets, transparently decrypting, modifying, and re-encrypting all traffic. To eliminate this, modern protocols authenticate public keys using Digital Signatures (RSA or ECDSA) bound to verified X.509 certificates.

Perfect Forward Secrecy (PFS):
In legacy TLS systems using static RSA key transport, the client encrypted the symmetric pre-master secret using the server's long-term RSA public key. If an attacker recorded years of encrypted internet traffic and later stole the server's private key, all recorded past sessions could be decrypted retrospectively ("Harvest Now, Decrypt Later").
Ephemeral Diffie-Hellman (DHE / ECDHE) solves this by generating single-use ephemeral keys a and b for every unique TLS session and immediately erasing them from memory upon session termination. Even if the server's long-term certificate private key is compromised in the future, past recorded sessions remain cryptographically impossible to decrypt.`,
    quizzes: [
      // Node 1: node-root-dh
      {
        id: 'quiz-rsa-01-a',
        question: 'What is the shared secret computed by Alice and Bob in standard Diffie-Hellman with private keys a and b, generator g, and prime modulus p?',
        options: ['g^(a+b) mod p', 'g^(ab) mod p', '(g^a + g^b) mod p', 'a * b mod p'],
        correctOptionIndex: 1,
        userSelectedIndex: 1,
        isAnsweredCorrectly: true,
        explanation: 'Alice computes (g^b)^a mod p and Bob computes (g^a)^b mod p, both equaling g^(ab) mod p by modular exponentiation rules.',
        relatedConceptNodeId: 'node-root-dh'
      },
      {
        id: 'quiz-rsa-01-b',
        question: 'Which values in the Diffie-Hellman key exchange are kept strictly secret by Alice and Bob?',
        options: ['Prime p and generator g', 'Public values A = g^a mod p and B = g^b mod p', 'Private exponents a and b', 'The hash algorithm used'],
        correctOptionIndex: 2,
        userSelectedIndex: null,
        isAnsweredCorrectly: false,
        explanation: 'Only private exponents a and b (and the derived key K) are kept secret. p, g, A, and B are all transmitted openly across the public network.',
        relatedConceptNodeId: 'node-root-dh'
      },
      {
        id: 'quiz-rsa-01-c',
        question: 'Can an adversary who observes public values g, p, g^a mod p, and g^b mod p compute g^(ab) mod p simply by multiplying (g^a mod p) * (g^b mod p)?',
        options: [
          'Yes, modular multiplication combines exponents into ab',
          'No, multiplying yields g^(a+b) mod p, not g^(ab) mod p',
          'Yes, if p is a prime number',
          'Only if generator g = 2'
        ],
        correctOptionIndex: 1,
        userSelectedIndex: null,
        isAnsweredCorrectly: false,
        explanation: 'Multiplying powers with the same base adds exponents: g^a * g^b = g^(a+b), which does not reveal g^(ab).',
        relatedConceptNodeId: 'node-root-dh'
      },
      {
        id: 'quiz-rsa-01-d',
        question: 'Why is modular arithmetic used in Diffie-Hellman instead of regular continuous exponentiation?',
        options: [
          'Because regular exponentiation produces numbers with millions of digits that overflow hardware and are easy to invert using standard logarithms',
          'To make the algorithm run in parallel on GPUs',
          'Because modular arithmetic only works with negative numbers',
          'To compress public keys to 1 byte'
        ],
        correctOptionIndex: 0,
        userSelectedIndex: null,
        isAnsweredCorrectly: false,
        explanation: 'Without modulus, g^a grows astronomically large and is easily inverted using real logarithms. The modulo operation keeps numbers bounded while scattering outputs pseudo-randomly.',
        relatedConceptNodeId: 'node-root-dh'
      },

      // Node 2: node-dlp-hardness
      {
        id: 'quiz-rsa-02-a',
        question: 'What mathematical hardness problem underpins the security of the classical Diffie-Hellman key exchange?',
        options: ['Integer Factorization of RSA Modulus', 'Discrete Logarithm Problem (DLP)', 'Traveling Salesperson Problem (TSP)', 'Shortest Vector Problem in Lattices'],
        correctOptionIndex: 1,
        userSelectedIndex: 1,
        isAnsweredCorrectly: true,
        explanation: 'Given g, p, and g^a mod p, solving for private exponent a is the Discrete Logarithm Problem, which has no polynomial-time classical solution for large primes.',
        relatedConceptNodeId: 'node-dlp-hardness'
      },
      {
        id: 'quiz-rsa-02-b',
        question: 'Why does Elliptic Curve Diffie-Hellman (ECDH) allow significantly shorter key lengths (e.g. 256 bits) than classical DH (2048+ bits) for equivalent security?',
        options: [
          'Because elliptic curves use faster silicon circuits',
          'Because sub-exponential index calculus attacks that solve DLP in finite fields do not apply to general elliptic curve groups',
          'Because elliptic curves encrypt twice per clock cycle',
          'Because elliptic curves eliminate prime numbers'
        ],
        correctOptionIndex: 1,
        userSelectedIndex: null,
        isAnsweredCorrectly: false,
        explanation: 'Finite field DLP is vulnerable to the sub-exponential Number Field Sieve (Index Calculus). Elliptic curve DLP has no known sub-exponential classical attack, requiring adversaries to use fully exponential Pollard rho.',
        relatedConceptNodeId: 'node-dlp-hardness'
      },
      {
        id: 'quiz-rsa-02-c',
        question: 'Which quantum algorithm solves both the Discrete Logarithm Problem and Integer Factorization in polynomial time O((log N)^3)?',
        options: ['Grover Algorithm', 'Shor Algorithm', 'Deutsch-Jozsa Algorithm', 'Simon Algorithm'],
        correctOptionIndex: 1,
        userSelectedIndex: null,
        isAnsweredCorrectly: false,
        explanation: 'Peter Shor\'s 1994 quantum algorithm computes period-finding in polynomial time, completely breaking RSA, classical DH, and ECDH on a cryptographically relevant quantum computer.',
        relatedConceptNodeId: 'node-dlp-hardness'
      },
      {
        id: 'quiz-rsa-02-d',
        question: 'What is a "primitive root modulo p"?',
        options: [
          'The square root of p rounded to nearest integer',
          'A generator g whose successive powers modulo p generate all non-zero residues from 1 to p-1',
          'A prime number that divides p exactly',
          'The private key chosen by Alice'
        ],
        correctOptionIndex: 1,
        userSelectedIndex: null,
        isAnsweredCorrectly: false,
        explanation: 'A primitive root generates the entire multiplicative group of integers modulo p, maximizing the cycle length and the space of possible public keys.',
        relatedConceptNodeId: 'node-dlp-hardness'
      },

      // Node 3: node-mitm-flaw
      {
        id: 'quiz-rsa-03-a',
        question: 'Why is unauthenticated Diffie-Hellman vulnerable to an active Man-in-the-Middle (MitM) attack?',
        options: [
          'Because Diffie-Hellman cannot encrypt text longer than 128 bytes',
          'Because the protocol provides secrecy against eavesdroppers but provides zero authentication of the parties\' identities',
          'Because prime p is public knowledge',
          'Because private keys are sent in plaintext'
        ],
        correctOptionIndex: 1,
        userSelectedIndex: 1,
        isAnsweredCorrectly: true,
        explanation: 'Diffie-Hellman establishes a secure channel, but without identity authentication, Alice cannot verify whether she is talking to Bob or to Mallory masquerading as Bob.',
        relatedConceptNodeId: 'node-mitm-flaw'
      },
      {
        id: 'quiz-rsa-03-b',
        question: 'How do TLS certificates and Public Key Infrastructure (PKI) prevent Diffie-Hellman MitM attacks?',
        options: [
          'By encrypting the internet cable',
          'By having a trusted Certificate Authority digitally sign the server\'s public key, allowing the client to verify authenticity',
          'By changing prime p every millisecond',
          'By disabling public Wi-Fi access'
        ],
        correctOptionIndex: 1,
        userSelectedIndex: null,
        isAnsweredCorrectly: false,
        explanation: 'The server signs its ephemeral DH public key with its long-term private key. The client verifies the signature against the trusted CA root store, ensuring Mallory cannot tamper with the exchange.',
        relatedConceptNodeId: 'node-mitm-flaw'
      },
      {
        id: 'quiz-rsa-03-c',
        question: 'If Mallory successfully performs a MitM attack on DH between Alice and Bob, how many distinct cryptographic keys does Mallory manage?',
        options: ['1 key', '2 keys (one shared with Alice, one shared with Bob)', '4 keys', '0 keys'],
        correctOptionIndex: 1,
        userSelectedIndex: null,
        isAnsweredCorrectly: false,
        explanation: 'Mallory negotiates key K1 with Alice and key K2 with Bob, decrypting Alice\'s messages with K1 and re-encrypting with K2 before forwarding to Bob.',
        relatedConceptNodeId: 'node-mitm-flaw'
      },
      {
        id: 'quiz-rsa-03-d',
        question: 'What is the role of an Authenticated Key Exchange (AKE) protocol like TLS 1.3?',
        options: [
          'It combines key agreement (ECDHE) with mutual digital signature verification in a single atomic handshake',
          'It replaces symmetric encryption with plain text',
          'It removes the need for Diffie-Hellman',
          'It eliminates private keys'
        ],
        correctOptionIndex: 0,
        userSelectedIndex: null,
        isAnsweredCorrectly: false,
        explanation: 'AKE protocols unify key derivation and cryptographic authentication so that no shared key is established unless identity proofs succeed.',
        relatedConceptNodeId: 'node-mitm-flaw'
      },

      // Node 4: node-forward-secrecy
      {
        id: 'quiz-rsa-04-a',
        question: 'What catastrophic vulnerability in legacy static RSA key exchange led TLS 1.3 to mandate Ephemeral Diffie-Hellman (ECDHE)?',
        options: [
          'RSA keys cannot encrypt more than 1MB of data',
          'Lack of Forward Secrecy: compromising the server\'s long-term RSA private key in the future allows all previously recorded historical sessions to be decrypted',
          'RSA does not support UTF-8 characters',
          'RSA private keys expire after 24 hours'
        ],
        correctOptionIndex: 1,
        userSelectedIndex: 1,
        isAnsweredCorrectly: true,
        explanation: 'Under static RSA, adversaries record encrypted traffic ("Harvest Now, Decrypt Later"). If the server private key leaks years later, every past session is compromised. ECDHE ephemeral keys prevent this.',
        relatedConceptNodeId: 'node-forward-secrecy'
      },
      {
        id: 'quiz-rsa-04-b',
        question: 'What makes Ephemeral Diffie-Hellman (ECDHE) "ephemeral"?',
        options: [
          'The prime modulus changes based on the user\'s IP address',
          'A brand new private/public keypair (a, g^a) is generated for each individual session and destroyed immediately after key derivation',
          'The packets disappear from network cables after 10 seconds',
          'It only works over wireless 5G connections'
        ],
        correctOptionIndex: 1,
        userSelectedIndex: null,
        isAnsweredCorrectly: false,
        explanation: 'The word ephemeral means short-lived: the private keys exist only in volatile RAM for milliseconds during the handshake and are never written to disk.',
        relatedConceptNodeId: 'node-forward-secrecy'
      },
      {
        id: 'quiz-rsa-04-c',
        question: 'If an adversary compromises a web server in 2027 and steals its TLS 1.3 certificate private key, can they decrypt sessions recorded in 2025 that used ECDHE?',
        options: [
          'Yes, the private key decrypts all historic traffic',
          'No, because the ephemeral session keys were destroyed in 2025 and cannot be derived from the long-term certificate private key',
          'Only if the client was running Google Chrome',
          'Yes, if the adversary has access to a quantum computer'
        ],
        correctOptionIndex: 1,
        userSelectedIndex: null,
        isAnsweredCorrectly: false,
        explanation: 'In ECDHE, the long-term private key was only used to authenticate signatures during the 2025 handshake, never to encrypt the session secret. Perfect Forward Secrecy preserves past privacy.',
        relatedConceptNodeId: 'node-forward-secrecy'
      },
      {
        id: 'quiz-rsa-04-d',
        question: 'What post-quantum key encapsulation mechanism (KEM) is being standardized in TLS to protect forward secrecy against future quantum attacks?',
        options: ['SHA-256', 'ML-KEM (Kyber lattice-based cryptography)', 'MD5 checksums', 'Blowfish cipher'],
        correctOptionIndex: 1,
        userSelectedIndex: null,
        isAnsweredCorrectly: false,
        explanation: 'NIST standardized ML-KEM (formerly CRYSTALS-Kyber), based on the hardness of Module Learning With Errors (MLWE) over polynomial lattices, which resists both classical and quantum cryptanalysis.',
        relatedConceptNodeId: 'node-forward-secrecy'
      }
    ],
    notes: [
      {
        id: 'note-rsa-01',
        title: 'Diffie-Hellman Algebraic Proof',
        category: 'Key Formulas',
        content: `**Alice Computes:**
\\[
K = (B)^a \\pmod p = (g^b \\pmod p)^a \\pmod p = g^{ba} \\pmod p
\\]
**Bob Computes:**
\\[
K = (A)^b \\pmod p = (g^a \\pmod p)^b \\pmod p = g^{ab} \\pmod p
\\]
Since \\(g^{ab} \\equiv g^{ba} \\pmod p\\), both parties establish an identical shared secret.`,
        updatedAt: 'Nov 11, 2026'
      }
    ],
    researchPaper: {
      title: 'New Directions in Cryptography',
      authors: 'Whitfield Diffie and Martin E. Hellman',
      conference: 'IEEE Transactions on Information Theory, Vol. IT-22, No. 6',
      year: 1976,
      arxivUrl: 'https://ee.stanford.edu/~hellman/publications/24.pdf',
      doiUrl: 'https://doi.org/10.1109/TIT.1976.1055638',
      abstract:
        'Two kinds of contemporary developments in cryptography are examined: widening applications of teleprocessing requiring new cryptographic techniques, and revolutionary developments in the theory of computational complexity making available new algorithmic structures.',
      keyContributions: [
        'Invention of Public Key Cryptography and asymmetric key distribution',
        'Introduction of the Diffie-Hellman Key Exchange algorithm based on discrete logarithms',
        'Conceptualization of digital signatures for message authentication',
        'Foundational shift from secret algorithms to computationally intractable trapdoor one-way functions'
      ],
      methodologicalBreakdown:
        'Diffie and Hellman formulated the concept of trapdoor one-way permutations: functions that are easy to compute in one direction but intractable to invert without privileged private trapdoor information.'
    },
    knowledgeGraph: {
      rootNodeId: 'node-root-dh',
      nodes: [
        {
          id: 'node-root-dh',
          label: 'Diffie-Hellman Key Exchange',
          category: 'Asymmetric Cryptography',
          depth: 1,
          status: 'mastered',
          importance: 'critical',
          summary: 'Cryptographic protocol enabling secure shared secret derivation over public channels.',
          shortLine: 'K = g^(ab) mod p shared secret negotiation',
          keyFormula: 'K = (g^a)^b ≡ (g^b)^a ≡ g^(ab) (mod p)',
          failureMode: 'Unauthenticated channel allows active adversary to intercept and split key agreement.',
          tier: 'macro',
          x: 280,
          y: 40
        },
        {
          id: 'node-dlp-hardness',
          label: 'Discrete Logarithm Problem (DLP)',
          category: 'Hardness Assumption',
          depth: 2,
          status: 'mastered',
          importance: 'critical',
          summary: 'Intractability of computing private exponent a given g and g^a mod p.',
          shortLine: 'Hardness assumption protecting private exponents',
          keyFormula: 'Find a given A = g^a (mod p) ⟹ Intractable classically',
          failureMode: 'Small prime modulus p or smooth group order allows Pollard Rho or Index Calculus factoring.',
          tier: 'standard',
          x: 120,
          y: 180
        },
        {
          id: 'node-mitm-flaw',
          label: 'Unauthenticated MitM Attack',
          category: 'Security Vulnerability',
          depth: 2,
          status: 'mastered',
          importance: 'critical',
          summary: 'Active attacker establishes separate DH keys with both parties.',
          shortLine: 'Lack of identity proofs enables transparent proxying',
          keyFormula: 'Alice ⟷ Mallory (K1); Mallory ⟷ Bob (K2)',
          failureMode: 'Adversary decrypts, snoops, and re-encrypts all communications in flight.',
          tier: 'standard',
          x: 440,
          y: 180
        },
        {
          id: 'node-forward-secrecy',
          label: 'Perfect Forward Secrecy (ECDHE)',
          category: 'Modern TLS Standard',
          depth: 3,
          status: 'in_progress',
          importance: 'critical',
          summary: 'Single-use ephemeral keypairs protect past traffic against future private key leaks.',
          shortLine: 'Disposable ephemeral keys prevent retrospective decryption',
          keyFormula: 'SessionKey ⟂ LongTermServerPrivateKey',
          failureMode: 'Static RSA key reuse allows adversaries to retroactively decrypt captured historical pcaps.',
          tier: 'standard',
          x: 280,
          y: 320
        }
      ],
      edges: [
        { id: 'e-dh-1', source: 'node-root-dh', target: 'node-dlp-hardness', label: 'Secured By' },
        { id: 'e-dh-2', source: 'node-root-dh', target: 'node-mitm-flaw', label: 'Vulnerable To' },
        { id: 'e-dh-3', source: 'node-mitm-flaw', target: 'node-forward-secrecy', label: 'Hardened By' }
      ]
    }
  },

  // -------------------------------------------------------------
  // SOURCE 4: Principal Component Analysis (PCA) (AIDS)
  // -------------------------------------------------------------
  {
    id: 'source-pca',
    title: 'Principal Component Analysis (PCA) & Eigen-Decompositions',
    category: 'AIDS',
    sourceType: 'paper',
    sourceTypeLabel: 'Linear Algebra & Dimensionality Reduction',
    thumbnail: '/thumbnails/thumb_aids_01.jpg',
    youtubeId: 'FgakZw6K1QQ',
    duration: '29:45',
    views: '1.2M views',
    channelName: 'takeUforward · Data Science',
    masteryScore: 76,
    masteryLevel: 'Proficient',
    lastStudied: 'Nov 10, 11:30 AM',
    summary:
      'Rigorous geometric intuition of orthogonal variance projection, covariance matrix diagonalization, and spectral decomposition.',
    transcript: `Principal Component Analysis (PCA) is an unsupervised dimensionality reduction technique widely used in machine learning, exploratory data analysis, and feature compression. In high-dimensional datasets, features frequently exhibit strong collinearity and redundancy. High dimensionality introduces the "Curse of Dimensionality", where the volume of space expands exponentially, causing data points to become equidistant and sparse.

Mathematical Derivation and Workflow of PCA:

1. Data Centering and Standardization:
Let X be an (n x d) data matrix representing n observations across d features. The first non-negotiable step is centering: we subtract the column mean μ from each column so that the empirical mean of every feature is 0:
X_centered = X - 1 * μ^T
If features are measured on disparate physical scales (e.g., house price in hundreds of thousands versus number of bedrooms in single digits), features with larger scales will artificially dominate variance. We divide each centered feature by its standard deviation σ_j, computing the Z-score normalized matrix Z.

2. The Empirical Covariance Matrix:
The sample covariance matrix Σ (a d x d symmetric square matrix) measures pairwise linear relationships across all dimensions:
Σ = (1 / (n - 1)) * X_centered^T * X_centered
The diagonal entries Σ_jj represent the variance of feature j, while off-diagonal entries Σ_jk represent the covariance between features j and k.

3. Eigen-Decomposition (Spectral Theorem):
Because Σ is symmetric and real-valued, the Spectral Theorem guarantees that Σ can be diagonalized into an orthonormal basis of eigenvectors:
Σ * v_i = λ_i * v_i
where:
- v_i is an eigenvector (direction of maximal variance).
- λ_i is the associated eigenvalue (the scalar quantity of variance preserved along direction v_i).
The eigenvectors are strictly mutually orthogonal (v_i · v_j = 0 for i ≠ j) and have unit norm (||v_i|| = 1).
Sorting eigenvalues in descending order: λ_1 ≥ λ_2 ≥ ... ≥ λ_d ≥ 0 ensures that the first principal component v_1 aligns with the direction of maximal variance.

4. Variance Preservation and Scree Plot:
The total variance in the dataset equals the trace of the covariance matrix, which identically equals the sum of all eigenvalues:
Total Variance = Tr(Σ) = ∑(λ_i)
The Explained Variance Ratio for principal component i is:
Explained Variance Ratio = λ_i / (∑ λ_j)
Practitioners choose the top k principal components (k << d) such that the cumulative explained variance reaches a target threshold (typically 90% or 95%).

5. Projection and Reconstruction:
Constructing projection matrix W_k = [v_1, v_2, ..., v_k] of dimension (d x k), the low-dimensional projected dataset Z is:
Z = X_centered * W_k  (dimension n x k)
Data points can be approximately reconstructed back into the original d-dimensional space:
X_approx = Z * W_k^T + μ
The reconstruction error ||X - X_approx||_F^2 is mathematically proven to be minimal among all linear projections of rank k.`,
    quizzes: [
      // Node 1: node-root-pca
      {
        id: 'quiz-pca-01-a',
        question: 'What is the primary optimization objective of Principal Component Analysis?',
        options: [
          'To maximize classification accuracy using label supervision',
          'To find orthogonal axes that maximize the variance of the projected data while minimizing reconstruction error',
          'To convert continuous features into categorical integers',
          'To eliminate all negative numbers from the dataset'
        ],
        correctOptionIndex: 1,
        userSelectedIndex: 1,
        isAnsweredCorrectly: true,
        explanation: 'PCA identifies orthogonal linear directions (principal components) along which the variance of the data is maximized, which is mathematically equivalent to minimizing the squared reconstruction error.',
        relatedConceptNodeId: 'node-root-pca'
      },
      {
        id: 'quiz-pca-01-b',
        question: 'Is PCA a supervised or unsupervised machine learning algorithm?',
        options: [
          'Supervised: it requires target labels to compute class separability',
          'Unsupervised: it operates strictly on feature matrix X without using any target labels y',
          'Reinforcement learning based',
          'Semi-supervised requiring at least 10% labeled data'
        ],
        correctOptionIndex: 1,
        userSelectedIndex: null,
        isAnsweredCorrectly: false,
        explanation: 'PCA does not use target labels; it relies solely on the internal covariance structure of input features X.',
        relatedConceptNodeId: 'node-root-pca'
      },
      {
        id: 'quiz-pca-01-c',
        question: 'What is the maximum number of non-zero principal components that can be extracted from an n x d data matrix?',
        options: ['d', 'n', 'min(n - 1, d)', 'n + d'],
        correctOptionIndex: 2,
        userSelectedIndex: null,
        isAnsweredCorrectly: false,
        explanation: 'The rank of the centered sample covariance matrix is at most min(n - 1, d), so at most min(n - 1, d) non-zero eigenvalues and components can exist.',
        relatedConceptNodeId: 'node-root-pca'
      },
      {
        id: 'quiz-pca-01-d',
        question: 'How does PCA differ from Linear Discriminant Analysis (LDA)?',
        options: [
          'PCA maximizes overall variance without labels; LDA is supervised and maximizes between-class variance relative to within-class variance',
          'PCA only works on images; LDA only works on text',
          'PCA uses neural networks; LDA uses decision trees',
          'They are mathematically identical algorithms'
        ],
        correctOptionIndex: 0,
        userSelectedIndex: null,
        isAnsweredCorrectly: false,
        explanation: 'LDA utilizes class labels to find projection axes that best separate categories, whereas PCA is completely unsupervised.',
        relatedConceptNodeId: 'node-root-pca'
      },

      // Node 2: node-standardization
      {
        id: 'quiz-pca-02-a',
        question: 'Why is feature standardization (Z-score normalization) critical before running PCA when features have different units?',
        options: [
          'Because PCA algorithms will crash with NaN errors if values are unnormalized',
          'Because features with naturally large numerical ranges will dominate the variance calculation, causing PCA to ignore features with smaller units regardless of their true information content',
          'To ensure all numbers are positive',
          'To reduce the size of the dataset on disk'
        ],
        correctOptionIndex: 1,
        userSelectedIndex: 1,
        isAnsweredCorrectly: true,
        explanation: 'PCA maximizes variance. If one feature is measured in kilograms (scale 1-100) and another in milligrams (scale 1,000-100,000), the milligram feature will dominate the variance solely due to arbitrary unit choice.',
        relatedConceptNodeId: 'node-standardization'
      },
      {
        id: 'quiz-pca-02-b',
        question: 'What is the formula for the Z-score standardization of feature value x?',
        options: ['z = x - mean', 'z = (x - mean) / std_dev', 'z = x * std_dev', 'z = (x - min) / (max - min)'],
        correctOptionIndex: 1,
        userSelectedIndex: null,
        isAnsweredCorrectly: false,
        explanation: 'Subtracting the mean centers the distribution at 0; dividing by standard deviation scales variance to exactly 1.0.',
        relatedConceptNodeId: 'node-standardization'
      },
      {
        id: 'quiz-pca-02-c',
        question: 'When performing PCA on an already standardized data matrix Z, the sample covariance matrix Z^T * Z / (n-1) is identical to what standard statistical matrix?',
        options: ['The Pearson Correlation Matrix', 'The Confusion Matrix', 'The Hessian Matrix', 'The Transition Probability Matrix'],
        correctOptionIndex: 0,
        userSelectedIndex: null,
        isAnsweredCorrectly: false,
        explanation: 'When features have zero mean and unit variance, covariance is mathematically identical to correlation. Running PCA on standardized data is equivalent to performing eigen-decomposition on the correlation matrix.',
        relatedConceptNodeId: 'node-standardization'
      },
      {
        id: 'quiz-pca-02-d',
        question: 'Should data centering be computed using the entire dataset including test data, or strictly on training data?',
        options: [
          'Always compute mean on the combined train and test data',
          'Strictly compute mean on the training split and apply that same mean to test data to prevent data leakage',
          'Centering is optional and has zero impact on PCA',
          'Only center test data'
        ],
        correctOptionIndex: 1,
        userSelectedIndex: null,
        isAnsweredCorrectly: false,
        explanation: 'Computing statistics on test data causes data leakage. Training statistics must be preserved and applied to validation/test sets.',
        relatedConceptNodeId: 'node-standardization'
      },

      // Node 3: node-covariance
      {
        id: 'quiz-pca-03-a',
        question: 'What mathematical property of the sample covariance matrix Σ guarantees that all its eigenvalues are real numbers and its eigenvectors are mutually orthogonal?',
        options: [
          'It is an upper triangular matrix',
          'It is a real-valued symmetric matrix (Σ = Σ^T)',
          'Its determinant is always 0',
          'It has prime dimensions'
        ],
        correctOptionIndex: 1,
        userSelectedIndex: 1,
        isAnsweredCorrectly: true,
        explanation: 'By the Spectral Theorem, any real symmetric matrix has strictly real eigenvalues and an orthonormal basis of eigenvectors.',
        relatedConceptNodeId: 'node-covariance'
      },
      {
        id: 'quiz-pca-03-b',
        question: 'What do the off-diagonal entries in the covariance matrix represent?',
        options: [
          'The variance of individual features',
          'The pairwise covariance (linear co-variation) between different feature pairs',
          'The eigenvalues of the matrix',
          'The mean of the dataset'
        ],
        correctOptionIndex: 1,
        userSelectedIndex: null,
        isAnsweredCorrectly: false,
        explanation: 'Diagonal entries Σ_ii are variances of feature i. Off-diagonal entries Σ_ij measure how features i and j vary together.',
        relatedConceptNodeId: 'node-covariance'
      },
      {
        id: 'quiz-pca-03-c',
        question: 'What does PCA accomplish regarding the covariance matrix of the projected data Z?',
        options: [
          'It sets all entries to 1',
          'It completely diagonalizes the covariance matrix, driving all off-diagonal covariances to zero (decorrelating the features)',
          'It makes the covariance matrix non-invertible',
          'It inverts the sign of all variances'
        ],
        correctOptionIndex: 1,
        userSelectedIndex: null,
        isAnsweredCorrectly: false,
        explanation: 'Because principal components are orthogonal, the covariance matrix of the projected components is a diagonal matrix containing eigenvalues: all cross-correlations are eliminated.',
        relatedConceptNodeId: 'node-covariance'
      },
      {
        id: 'quiz-pca-03-d',
        question: 'Can Singular Value Decomposition (SVD) be used to compute PCA without explicitly constructing the d x d covariance matrix X^T * X?',
        options: [
          'No, PCA can only be computed via covariance matrices',
          'Yes, computing SVD directly on X = U * S * V^T yields principal direction vectors V with superior numerical stability',
          'SVD only works for square matrices',
          'SVD introduces complex numbers'
        ],
        correctOptionIndex: 1,
        userSelectedIndex: null,
        isAnsweredCorrectly: false,
        explanation: 'In practice, numerical libraries use SVD on X directly (X = U S V^T). The right singular vectors V are the exact eigenvectors of X^T X, avoiding loss of precision when forming X^T X.',
        relatedConceptNodeId: 'node-covariance'
      },

      // Node 4: node-eigen-vectors
      {
        id: 'quiz-pca-04-a',
        question: 'What does the magnitude of eigenvalue λ_i represent in PCA?',
        options: [
          'The classification accuracy of component i',
          'The amount of variance retained along the direction of eigenvector v_i',
          'The number of rows in the dataset',
          'The compression ratio of the algorithm'
        ],
        correctOptionIndex: 1,
        userSelectedIndex: 1,
        isAnsweredCorrectly: true,
        explanation: 'Each eigenvalue λ_i corresponds to the variance of the projected data along the axis defined by eigenvector v_i.',
        relatedConceptNodeId: 'node-eigen-vectors'
      },
      {
        id: 'quiz-pca-04-b',
        question: 'If a dataset has eigenvalues λ_1 = 40, λ_2 = 20, λ_3 = 15, λ_4 = 5, what percentage of total variance is captured by the first two principal components?',
        options: ['50%', '60%', '75%', '85%'],
        correctOptionIndex: 2,
        userSelectedIndex: null,
        isAnsweredCorrectly: false,
        explanation: 'Total variance = 40 + 20 + 15 + 5 = 80. The first two components capture (40 + 20) / 80 = 60 / 80 = 75%.',
        relatedConceptNodeId: 'node-eigen-vectors'
      },
      {
        id: 'quiz-pca-04-c',
        question: 'What is a "Scree Plot" used for in PCA?',
        options: [
          'To detect corrupted image files',
          'A graphical plot of eigenvalues ordered by rank, used to identify the "elbow" point where adding more components yields diminishing returns',
          'A scatter plot of residuals during linear regression',
          'A map of neural network weights'
        ],
        correctOptionIndex: 1,
        userSelectedIndex: null,
        isAnsweredCorrectly: false,
        explanation: 'A scree plot shows eigenvalues in descending order. The "elbow" indicates the transition point where subsequent components capture predominantly random noise.',
        relatedConceptNodeId: 'node-eigen-vectors'
      },
      {
        id: 'quiz-pca-04-d',
        question: 'Why are principal component eigenvectors guaranteed to have zero mutual correlation?',
        options: [
          'Because they are calculated from random numbers',
          'Because they form an orthonormal basis (v_i · v_j = 0 for i ≠ j) diagonalizing the covariance matrix',
          'Because they are sorted alphabetically',
          'Because the user specifies zero correlation manually'
        ],
        correctOptionIndex: 1,
        userSelectedIndex: null,
        isAnsweredCorrectly: false,
        explanation: 'Eigenvectors of a symmetric matrix corresponding to distinct eigenvalues are mutually orthogonal. Rotating data into this orthogonal coordinate system eliminates all linear redundancy.',
        relatedConceptNodeId: 'node-eigen-vectors'
      }
    ],
    notes: [
      {
        id: 'note-pca-01',
        title: 'Spectral Decomposition of Covariance Matrix',
        category: 'Key Formulas',
        content: `**Covariance Formulation:**
\\[
\\Sigma = \\frac{1}{n-1} X_{\\text{centered}}^T X_{\\text{centered}}
\\]
**Characteristic Equation:**
\\[
\\Sigma v_i = \\lambda_i v_i \\quad \\text{where } ||v_i|| = 1 \\text{ and } v_i \\cdot v_j = 0 \\text{ for } i \\neq j
\\]
Eigenvalue \\(\\lambda_i\\) directly measures variance along eigenvector \\(v_i\\).`,
        updatedAt: 'Nov 10, 2026'
      }
    ],
    researchPaper: {
      title: 'On Lines and Planes of Closest Fit to Systems of Points in Space',
      authors: 'Karl Pearson, F.R.S.',
      conference: 'Philosophical Magazine, Series 6, Vol. 2, No. 11',
      year: 1901,
      arxivUrl: 'https://doi.org/10.1080/14786440109462720',
      doiUrl: 'https://doi.org/10.1080/14786440109462720',
      abstract:
        'In this foundational 1901 paper, Karl Pearson invents Principal Component Analysis, framing it geometrically as finding the lines and planes of best fit to a system of points in multidimensional space by minimizing the sum of the squares of the normal distances.',
      keyContributions: [
        'Formulation of orthogonal linear regression minimizing normal Euclidean distances',
        'Invention of the method of principal axes and principal component projection',
        'Extension of bivariate correlation into arbitrary multidimensional data spaces'
      ],
      methodologicalBreakdown:
        'Pearson proves that the best-fitting linear subspace coincides with the principal axes of the inertia or covariance ellipsoid.'
    },
    knowledgeGraph: {
      rootNodeId: 'node-root-pca',
      nodes: [
        {
          id: 'node-root-pca',
          label: 'Principal Component Analysis (PCA)',
          category: 'Dimensionality Reduction',
          depth: 1,
          status: 'mastered',
          importance: 'critical',
          summary: 'Unsupervised projection maximizing variance and minimizing reconstruction loss.',
          shortLine: 'Orthogonal linear projection preserving maximal variance',
          keyFormula: 'max Var(Xw) subject to ||w|| = 1',
          failureMode: 'Non-linear manifolds (e.g. Swiss Roll) cannot be unfolded by linear PCA.',
          tier: 'macro',
          x: 280,
          y: 40
        },
        {
          id: 'node-standardization',
          label: 'Feature Standardization (Z-score)',
          category: 'Data Preprocessing',
          depth: 2,
          status: 'mastered',
          importance: 'critical',
          summary: 'Zero-mean and unit variance scaling preventing scale dominance.',
          shortLine: 'z = (x - μ) / σ equalizes feature influence',
          keyFormula: 'z = (x - μ) / σ  ⟹  Var(z) = 1.0',
          failureMode: 'Unscaled features with large numerical units dominate variance calculation.',
          tier: 'standard',
          x: 120,
          y: 180
        },
        {
          id: 'node-covariance',
          label: 'Covariance Matrix Decomposition',
          category: 'Linear Algebra',
          depth: 2,
          status: 'mastered',
          importance: 'critical',
          summary: 'Symmetric matrix Σ capturing all pairwise linear feature relationships.',
          shortLine: 'Σ = (1/(n-1)) X^T X captures pairwise co-variance',
          keyFormula: 'Σ = (1/(n-1)) X^T X',
          failureMode: 'Severe multicollinearity yields near-singular matrices with rank < d.',
          tier: 'standard',
          x: 440,
          y: 180
        },
        {
          id: 'node-eigen-vectors',
          label: 'Eigenvectors & Explained Variance',
          category: 'Projection Axes',
          depth: 3,
          status: 'in_progress',
          importance: 'foundational',
          summary: 'Eigenvectors determine projection axes; eigenvalues quantify preserved variance.',
          shortLine: 'Σ v_i = λ_i v_i defines principal directions',
          keyFormula: 'Σ v_i = λ_i v_i, Explained Variance = λ_i / Σ λ',
          failureMode: 'Discarding too many components leads to severe information and signal loss.',
          tier: 'standard',
          x: 280,
          y: 320
        }
      ],
      edges: [
        { id: 'e-pca-1', source: 'node-root-pca', target: 'node-standardization', label: 'Requires' },
        { id: 'e-pca-2', source: 'node-root-pca', target: 'node-covariance', label: 'Constructs' },
        { id: 'e-pca-3', source: 'node-covariance', target: 'node-eigen-vectors', label: 'Decomposes Into' }
      ]
    }
  },

  // -------------------------------------------------------------
  // SOURCE 5: The Celebrity Problem (Stack & Elimination O(N))
  // -------------------------------------------------------------
  {
    id: 'source-celebrity-problem',
    title: 'The Celebrity Problem (Stack & Elimination O(N))',
    category: 'Computer Science',
    sourceType: 'algorithm_lab',
    sourceTypeLabel: 'Algorithms & Data Structures',
    thumbnail: '/thumbnails/thumb_celebrity.jpg',
    youtubeId: 'Z5AEc12ieOs',
    duration: '26:40',
    views: '740K views',
    channelName: 'takeUforward · Striver DSA',
    masteryScore: 90,
    masteryLevel: 'Mastered',
    lastStudied: 'Yesterday, 4:15 PM',
    summary:
      'Stack-based and two-pointer elimination paradigms reducing quadratic O(N²) matrix queries to linear O(N) verification.',
    transcript: `The Celebrity Problem is a classic graph and algorithmic interview problem testing state invariant deduction, elimination paradigms, and optimal reduction from quadratic to linear time complexity.

Problem Formalization:
In a party of N individuals (labeled 0 through N - 1), a "Celebrity" is defined by two mathematical conditions:
1. Universal Recognition: Every other person in the party knows the celebrity. In graph-theoretic terms, the in-degree of the celebrity node is exactly N - 1.
2. Complete Anonymity: The celebrity does not know anyone else in the party. In graph-theoretic terms, the out-degree of the celebrity node is exactly 0.
You are given an API function knows(A, B) that returns true if person A knows person B, and false otherwise. Your objective is to identify the celebrity or determine that no celebrity exists, using the minimum number of calls to knows(A, B).

Naive Matrix Examination (O(N^2)):
The acquaintance relationship can be modeled as an N x N adjacency matrix M where M[i][j] = 1 if person i knows person j, and 0 otherwise. A naive algorithm scans the entire matrix:
For each candidate i:
- Verify that row i contains all 0s (person i knows nobody).
- Verify that column i contains all 1s except at M[i][i] (everyone knows person i).
Evaluating every entry requires O(N^2) inquiries, which is computationally unacceptable for large N (e.g. N = 100,000).

The Core Elimination Invariant (O(1) per step):
Observe what happens when we evaluate knows(A, B) for any two distinct candidates A and B:
- Case 1: knows(A, B) == true
  A knows B. By definition, a celebrity cannot know anyone. Therefore, A CANNOT be the celebrity. A is permanently eliminated! (B survives as a potential candidate).
- Case 2: knows(A, B) == false
  A does not know B. By definition, everyone must know the celebrity. Since A does not know B, B CANNOT be the celebrity. B is permanently eliminated! (A survives as a potential candidate).

Notice the critical property: A single query to knows(A, B) unconditionally eliminates exactly one person from the candidate pool!

The O(N) Elimination Phase:
1. Stack Implementation:
   Push all N candidates (0 to N - 1) onto a stack. While the stack contains more than one person:
   - Pop candidate A and candidate B.
   - If knows(A, B) is true: discard A, push B back.
   - If knows(A, B) is false: discard B, push A back.
   After exactly N - 1 queries, only one candidate C remains in the stack.
2. Two-Pointer Implementation (O(1) Auxiliary Space):
   Set pointer i = 0 and pointer j = N - 1. While i < j:
   - If knows(i, j) is true: i++ (eliminate i).
   - If knows(i, j) is false: j-- (eliminate j).
   When i == j, candidate i is the sole survivor.

The Critical Two-Pass Verification Phase:
The elimination phase guarantees that IF a celebrity exists, it must be the surviving candidate C. However, it does NOT guarantee that C is actually a celebrity! (For example, in a party where nobody knows anybody, one candidate still survives the elimination phase).
Therefore, a mandatory verification phase checks candidate C:
- Row check: For all k ≠ C, verify knows(C, k) == false (C knows no one).
- Column check: For all k ≠ C, verify knows(k, C) == true (everyone knows C).
If all 2(N - 1) checks pass, C is the verified celebrity; otherwise, no celebrity exists.

Total Complexity:
- Elimination: N - 1 queries.
- Verification: 2(N - 1) queries.
- Total queries: 3(N - 1) = O(N) linear time complexity.
- Space Complexity: O(1) auxiliary space using two pointers.`,
    quizzes: [
      // Node 1: node-root-cel
      {
        id: 'quiz-cel-01-a',
        question: 'What is the graph-theoretic definition of a Celebrity in an acquaintance directed graph with N nodes?',
        options: [
          'In-degree = 0 and Out-degree = N - 1',
          'In-degree = N - 1 and Out-degree = 0',
          'In-degree = N / 2 and Out-degree = N / 2',
          'A node that is part of a Hamiltonian cycle'
        ],
        correctOptionIndex: 1,
        userSelectedIndex: 1,
        isAnsweredCorrectly: true,
        explanation: 'A celebrity is known by all other N - 1 people (in-degree = N - 1) and knows nobody in return (out-degree = 0).',
        relatedConceptNodeId: 'node-root-cel'
      },
      {
        id: 'quiz-cel-01-b',
        question: 'How many celebrities can simultaneously exist in a party of N people?',
        options: ['At most 1', 'At most 2', 'Up to N / 2', 'N celebrities'],
        correctOptionIndex: 0,
        userSelectedIndex: null,
        isAnsweredCorrectly: false,
        explanation: 'Suppose there are two celebrities C1 and C2. C1 must know C2 (since everyone knows C2). But celebrities know nobody! This contradiction proves at most 1 celebrity can exist.',
        relatedConceptNodeId: 'node-root-cel'
      },
      {
        id: 'quiz-cel-01-c',
        question: 'What is the time complexity of the naive algorithm that scans the entire N x N acquaintance matrix?',
        options: ['O(N)', 'O(N log N)', 'O(N^2)', 'O(2^N)'],
        correctOptionIndex: 2,
        userSelectedIndex: null,
        isAnsweredCorrectly: false,
        explanation: 'The naive algorithm inspects all N x N cells in the adjacency matrix, resulting in O(N^2) complexity.',
        relatedConceptNodeId: 'node-root-cel'
      },
      {
        id: 'quiz-cel-01-d',
        question: 'In the adjacency matrix M, what does M[C][C] represent for a celebrity candidate C?',
        options: [
          'Whether the celebrity knows themselves, which is ignored because self-acquaintance is not part of the relationship model',
          'The celebrity\'s rank in the party',
          'A mandatory 1 value',
          'A deadlock indicator'
        ],
        correctOptionIndex: 0,
        userSelectedIndex: null,
        isAnsweredCorrectly: false,
        explanation: 'The diagonal entry M[C][C] represents self-acquaintance and is excluded from both in-degree and out-degree evaluations.',
        relatedConceptNodeId: 'node-root-cel'
      },

      // Node 2: node-cel-invariants
      {
        id: 'quiz-cel-02-a',
        question: 'If knows(A, B) returns true, which candidate can be decisively eliminated?',
        options: [
          'Candidate A, because a celebrity knows nobody, and A knows B',
          'Candidate B, because a celebrity cannot be known by others',
          'Both A and B',
          'Neither candidate can be eliminated'
        ],
        correctOptionIndex: 0,
        userSelectedIndex: 0,
        isAnsweredCorrectly: true,
        explanation: 'If A knows B, A violates the celebrity condition of out-degree = 0. A cannot be the celebrity.',
        relatedConceptNodeId: 'node-cel-invariants'
      },
      {
        id: 'quiz-cel-02-b',
        question: 'If knows(A, B) returns false, which candidate can be decisively eliminated?',
        options: [
          'Candidate A',
          'Candidate B, because everyone must know the celebrity, and A does not know B',
          'Both A and B',
          'Neither candidate can be eliminated'
        ],
        correctOptionIndex: 1,
        userSelectedIndex: null,
        isAnsweredCorrectly: false,
        explanation: 'If A does not know B, B violates the celebrity condition of in-degree = N - 1. B cannot be the celebrity.',
        relatedConceptNodeId: 'node-cel-invariants'
      },
      {
        id: 'quiz-cel-02-c',
        question: 'Does the elimination invariant depend on the order in which candidate pairs are compared?',
        options: [
          'Yes, comparisons must be sorted in ascending order of index',
          'No, any pair of candidates compared with knows(A, B) eliminates exactly one candidate regardless of evaluation order',
          'It only works if comparing adjacent elements',
          'The invariant only holds for prime values of N'
        ],
        correctOptionIndex: 1,
        userSelectedIndex: null,
        isAnsweredCorrectly: false,
        explanation: 'The logical deductions hold for arbitrary pairs. Any single query reduces the candidate set size by exactly 1.',
        relatedConceptNodeId: 'node-cel-invariants'
      },
      {
        id: 'quiz-cel-02-d',
        question: 'How many pairwise knows() queries are executed during the elimination phase to reduce N candidates down to 1 survivor?',
        options: ['N / 2', 'N - 1', 'N log N', '2N'],
        correctOptionIndex: 1,
        userSelectedIndex: null,
        isAnsweredCorrectly: false,
        explanation: 'Each query eliminates exactly 1 candidate. To eliminate N - 1 candidates from a pool of N, exactly N - 1 queries are required.',
        relatedConceptNodeId: 'node-cel-invariants'
      },

      // Node 3: node-cel-elimination
      {
        id: 'quiz-cel-03-a',
        question: 'How can the elimination phase be implemented using O(1) auxiliary space instead of an O(N) stack?',
        options: [
          'By using a two-pointer approach with pointers at i = 0 and j = N - 1',
          'By sorting the matrix with mergesort',
          'By allocating a dynamic hash table',
          'It is mathematically impossible to achieve O(1) space'
        ],
        correctOptionIndex: 0,
        userSelectedIndex: 0,
        isAnsweredCorrectly: true,
        explanation: 'Using two pointers i and j moving towards each other, we increment i if knows(i, j) is true, or decrement j if false, using strictly O(1) memory.',
        relatedConceptNodeId: 'node-cel-elimination'
      },
      {
        id: 'quiz-cel-03-b',
        question: 'In the stack-based elimination algorithm, what is done after popping candidates A and B and testing knows(A, B)?',
        options: [
          'Both A and B are pushed back to the stack',
          'The candidate that survived elimination is pushed back onto the stack',
          'The stack is completely cleared',
          'A recursive call is made with N - 2'
        ],
        correctOptionIndex: 1,
        userSelectedIndex: null,
        isAnsweredCorrectly: false,
        explanation: 'The eliminated candidate is discarded, and the surviving candidate is pushed back to compete against remaining candidates.',
        relatedConceptNodeId: 'node-cel-elimination'
      },
      {
        id: 'quiz-cel-03-c',
        question: 'What is the auxiliary space complexity of the stack-based elimination approach?',
        options: ['O(1)', 'O(log N)', 'O(N)', 'O(N^2)'],
        correctOptionIndex: 2,
        userSelectedIndex: null,
        isAnsweredCorrectly: false,
        explanation: 'Pushing all N elements onto the stack initially consumes O(N) auxiliary memory.',
        relatedConceptNodeId: 'node-cel-elimination'
      },
      {
        id: 'quiz-cel-03-d',
        question: 'Can the elimination phase alone determine whether a celebrity actually exists in the party?',
        options: [
          'Yes, the surviving candidate is always guaranteed to be a celebrity',
          'No, the elimination phase only identifies a potential candidate; a verification phase is strictly required',
          'It only guarantees existence when N is an odd number',
          'Yes, because celebrities are mathematically guaranteed to exist in any party'
        ],
        correctOptionIndex: 1,
        userSelectedIndex: null,
        isAnsweredCorrectly: false,
        explanation: 'Elimination filters out non-celebrities. If no celebrity exists, one candidate still survives, which would cause a false positive without verification.',
        relatedConceptNodeId: 'node-cel-elimination'
      },

      // Node 4: node-cel-verification
      {
        id: 'quiz-cel-04-a',
        question: 'Why is the final two-pass verification phase strictly mandatory after the elimination phase finishes?',
        options: [
          'To sort the candidates in alphabetical order',
          'Because if no celebrity exists at all (e.g. nobody knows anyone), one candidate still survives the elimination phase and would produce a false positive without verification',
          'To free memory allocated on the heap',
          'To calculate the celebrity\'s salary'
        ],
        correctOptionIndex: 1,
        userSelectedIndex: 1,
        isAnsweredCorrectly: true,
        explanation: 'Elimination only guarantees that IF a celebrity exists, it must be the survivor C. If the party has zero celebrities, C still survives and must be verified.',
        relatedConceptNodeId: 'node-cel-verification'
      },
      {
        id: 'quiz-cel-04-b',
        question: 'What specific conditions are checked during the verification phase for candidate C?',
        options: [
          'For all i ≠ C: knows(C, i) == false AND knows(i, C) == true',
          'knows(C, 0) == true',
          'C > 0',
          'knows(C, C) == true'
        ],
        correctOptionIndex: 0,
        userSelectedIndex: null,
        isAnsweredCorrectly: false,
        explanation: 'Verification confirms both requirements: C knows no one (knows(C, i) == false for all i ≠ C) and everyone knows C (knows(i, C) == true for all i ≠ C).',
        relatedConceptNodeId: 'node-cel-verification'
      },
      {
        id: 'quiz-cel-04-c',
        question: 'How many knows() queries are made during the verification phase in the worst case?',
        options: ['N', '2 * (N - 1)', 'N^2', 'log N'],
        correctOptionIndex: 1,
        userSelectedIndex: null,
        isAnsweredCorrectly: false,
        explanation: 'Checking that C knows no one takes N - 1 queries; checking that all N - 1 others know C takes another N - 1 queries, totaling 2(N - 1) queries.',
        relatedConceptNodeId: 'node-cel-verification'
      },
      {
        id: 'quiz-cel-04-d',
        question: 'What is the total number of knows() calls for the entire optimal algorithm (Elimination + Verification)?',
        options: ['N - 1', '2(N - 1)', '3(N - 1)', 'N^2 / 2'],
        correctOptionIndex: 2,
        userSelectedIndex: null,
        isAnsweredCorrectly: false,
        explanation: 'Elimination uses N - 1 queries, and verification uses at most 2(N - 1) queries, giving a total of at most 3(N - 1) queries, which is strictly O(N).',
        relatedConceptNodeId: 'node-cel-verification'
      }
    ],
    notes: [
      {
        id: 'note-cel-01',
        title: 'Optimal Two-Pointer Elimination',
        category: 'Core Mechanics',
        content: `**Two-Pointer Algorithm:**
\`\`\`cpp
int findCelebrity(int n) {
  int i = 0, j = n - 1;
  while (i < j) {
    if (knows(i, j)) i++; // i knows j -> i cannot be celebrity
    else j--;             // i doesn't know j -> j cannot be celebrity
  }
  int candidate = i;
  for (int k = 0; k < n; k++) {
    if (k == candidate) continue;
    if (knows(candidate, k) || !knows(k, candidate)) return -1;
  }
  return candidate;
}
\`\`\``,
        updatedAt: 'Nov 12, 2026'
      }
    ],
    researchPaper: {
      title: 'The Celebrity Problem and Graph Degree Constrained Tournaments',
      authors: 'A. Aho, J. Hopcroft, J. Ullman',
      conference: 'Data Structures and Algorithms Analysis, Addison-Wesley',
      year: 1983,
      arxivUrl: 'https://en.wikipedia.org/wiki/Celebrity_problem',
      abstract:
        'A comprehensive study on reduction techniques for tournament-style elimination problems where comparisons yield asymmetrical negative invariants.',
      keyContributions: [
        'Formulation of the 3(N - 1) query lower-bound for celebrity identification',
        'Demonstration of equivalence between stack and two-pointer elimination',
        'Application to graph sink identification in directed acyclic graphs'
      ],
      methodologicalBreakdown:
        'The paper proves that a single inquiry eliminates one vertex from candidacy, bounding the search tree height to linear depth.'
    },
    knowledgeGraph: {
      rootNodeId: 'node-root-cel',
      nodes: [
        {
          id: 'node-root-cel',
          label: 'The Celebrity Problem',
          category: 'Algorithm Problem',
          depth: 1,
          status: 'mastered',
          importance: 'critical',
          summary: 'Find a person in a party known by all and knowing none.',
          shortLine: 'In-degree = N - 1, Out-degree = 0 sink search',
          keyFormula: 'In-degree(C) = N - 1 ∧ Out-degree(C) = 0',
          failureMode: 'Assuming elimination survivor is always a celebrity without verification.',
          tier: 'macro',
          x: 280,
          y: 40
        },
        {
          id: 'node-cel-invariants',
          label: 'Core Invariants & Degree Logic',
          category: 'Mathematical Proof',
          depth: 2,
          status: 'mastered',
          importance: 'critical',
          summary: 'knows(A, B) = true ⟹ A eliminated; knows(A, B) = false ⟹ B eliminated.',
          shortLine: 'Every single query eliminates exactly one candidate',
          keyFormula: 'knows(A,B) ? eliminate(A) : eliminate(B)',
          failureMode: 'Accidentally discarding the wrong candidate on negative responses.',
          tier: 'standard',
          x: 120,
          y: 180
        },
        {
          id: 'node-cel-elimination',
          label: 'Stack & Pointer Elimination O(N)',
          category: 'Algorithm Strategy',
          depth: 2,
          status: 'mastered',
          importance: 'foundational',
          summary: 'Reduces N candidates to 1 in N - 1 comparison queries.',
          shortLine: 'N - 1 queries eliminate N - 1 non-celebrities',
          keyFormula: 'Queries = N - 1, Space = O(1)',
          failureMode: 'Infinite loop if pointer conditions are not strictly decremented.',
          tier: 'standard',
          x: 440,
          y: 180
        },
        {
          id: 'node-cel-verification',
          label: 'Final Two-Pass Verification',
          category: 'Correctness Guarantee',
          depth: 3,
          status: 'mastered',
          importance: 'critical',
          summary: 'Confirms candidate has zero out-degree and N - 1 in-degree.',
          shortLine: 'Mandatory 2(N - 1) checks preventing false positives',
          keyFormula: '∀ i ≠ C: !knows(C, i) ∧ knows(i, C)',
          failureMode: 'False positive output in parties with zero celebrities.',
          tier: 'standard',
          x: 280,
          y: 320
        }
      ],
      edges: [
        { id: 'e-cel-1', source: 'node-root-cel', target: 'node-cel-invariants', label: 'Governed By' },
        { id: 'e-cel-2', source: 'node-cel-invariants', target: 'node-cel-elimination', label: 'Enables' },
        { id: 'e-cel-3', source: 'node-cel-elimination', target: 'node-cel-verification', label: 'Validated By' }
      ]
    }
  },

  // -------------------------------------------------------------
  // SOURCE 6: Sliding Window Maximum & Deque Monotonicity (CS)
  // -------------------------------------------------------------
  {
    id: 'source-sliding-window',
    title: 'Sliding Window Maximum & Deque Monotonicity',
    category: 'Computer Science',
    sourceType: 'algorithm_lab',
    sourceTypeLabel: 'Algorithms & Data Structures',
    thumbnail: '/thumbnails/thumb_sliding_window.jpg',
    youtubeId: 'CZQGRp93K4k',
    duration: '31:15',
    views: '950K views',
    channelName: 'takeUforward · Striver DSA',
    masteryScore: 88,
    masteryLevel: 'Advanced',
    lastStudied: 'Nov 8, 9:20 PM',
    summary:
      'Monotonically decreasing deque data structure achieving strict amortized O(N) linear time across array windows.',
    transcript: `The Sliding Window Maximum problem (LeetCode 239) is a premier algorithmic benchmark evaluating monotonic data structures, amortized time analysis, and index boundary lifecycle management.

Problem Statement:
You are given an array of integers nums and a sliding window of size k which is moving from the very left of the array to the very right. You can only see the k numbers in the window. Each time the sliding window moves right by one position, you must return the maximum value currently visible in the window.

Naive and Heap Approaches:
1. Brute Force (O(N * k)):
   At each of the N - k + 1 window positions, iterate through all k elements to determine the maximum. For N = 100,000 and k = 50,000, this requires ~5 billion operations, easily triggering a Time Limit Exceeded (TLE).
2. Max-Heap / Priority Queue (O(N log k)):
   Store pairs of (nums[i], i) in a max-heap. The top of the heap is always the maximum. If the top element\'s index is outside the current window (i.e. index <= i - k), lazily pop it. While O(N log k) is acceptable, it is not asymptotically optimal.

The Optimal Monotonic Deque Approach (O(N)):
To achieve strictly linear O(N) runtime, we utilize a double-ended queue (std::deque in C++ or ArrayDeque in Java/Python) storing array indices rather than values.

The Two Invariants of the Decreasing Monotonic Deque:
1. Strict Value Monotonicity:
   The elements referenced by the indices in the deque must strictly decrease in value from front to back:
   nums[deque.front()] > nums[deque[1]] > ... > nums[deque.back()]
2. Window Index Validity:
   Every index currently stored in the deque must fall within the current sliding window boundary:
   i - k + 1 <= index <= i

Step-by-Step Algorithm Mechanics:
For each index i from 0 to N - 1:
1. Evict Out-of-Bounds Indices from the Front:
   Check if the oldest index at the front of the deque has slid out of the window:
   if (!deque.empty() && deque.front() <= i - k) { deque.pop_front(); }
2. Maintain Monotonicity from the Back:
   Before inserting the current element nums[i], examine the back of the deque:
   while (!deque.empty() && nums[deque.back()] <= nums[i]) {
     deque.pop_back();
   }
   Why? If an element nums[back] is smaller than or equal to nums[i], and appears EARLIER in the array than nums[i], nums[back] can NEVER be the maximum in any current or future window that contains nums[i]! It is completely dominated by nums[i].
3. Push Current Index:
   deque.push_back(i);
4. Record Window Maximum:
   Once the first window is fully formed (i.e. i >= k - 1), the element at the front of the deque (nums[deque.front()]) is mathematically guaranteed to be the maximum of the current window. Append it to the result array.

Amortized Complexity Analysis:
Although the while loop pops elements from the back of the deque, each array element is pushed onto the deque exactly ONCE and popped from the deque at most ONCE across the entire algorithm.
Total push operations = N.
Total pop operations <= N.
Total operations across all N iterations <= 2N = O(N) strictly linear runtime.
Space complexity is O(k) auxiliary memory to store at most k indices in the deque.`,
    quizzes: [
      // Node 1: node-root-sw
      {
        id: 'quiz-sw-01-a',
        question: 'What is the optimal time complexity for finding the maximum in a sliding window of size k across an array of size N?',
        options: ['O(N * k)', 'O(N log k)', 'O(N) linear time', 'O(k log N)'],
        correctOptionIndex: 2,
        userSelectedIndex: 2,
        isAnsweredCorrectly: true,
        explanation: 'Using a monotonic double-ended queue (deque), every index is pushed and popped at most once, yielding O(N) amortized time.',
        relatedConceptNodeId: 'node-root-sw'
      },
      {
        id: 'quiz-sw-01-b',
        question: 'Why does storing indices in the deque instead of values enable proper sliding window management?',
        options: [
          'Indices require less memory than values',
          'Indices allow immediate calculation of whether an element has expired and slid out of the active window boundary (index <= i - k)',
          'Values cannot be compared in a deque',
          'Indices prevent negative numbers from being stored'
        ],
        correctOptionIndex: 1,
        userSelectedIndex: null,
        isAnsweredCorrectly: false,
        explanation: 'Storing indices allows direct verification of window validity (i - k < index <= i) while still allowing value lookup via nums[index].',
        relatedConceptNodeId: 'node-root-sw'
      },
      {
        id: 'quiz-sw-01-c',
        question: 'How many total sliding windows of size k exist in an array of length N?',
        options: ['N - k', 'N - k + 1', 'N / k', 'k'],
        correctOptionIndex: 1,
        userSelectedIndex: null,
        isAnsweredCorrectly: false,
        explanation: 'The window starts at index 0 and slides until its right boundary reaches index N - 1, producing exactly N - k + 1 windows.',
        relatedConceptNodeId: 'node-root-sw'
      },
      {
        id: 'quiz-sw-01-d',
        question: 'At which iteration index i does the algorithm first begin recording window maximums?',
        options: ['i = 0', 'i = 1', 'i = k - 1', 'i = k'],
        correctOptionIndex: 2,
        userSelectedIndex: null,
        isAnsweredCorrectly: false,
        explanation: 'The first complete window spans indices 0 through k - 1, so the first maximum is recorded when i reaches k - 1.',
        relatedConceptNodeId: 'node-root-sw'
      },

      // Node 2: node-sw-deque
      {
        id: 'quiz-sw-02-a',
        question: 'What invariant is maintained across the elements in the Monotonic Deque for the Sliding Window Maximum problem?',
        options: [
          'Elements are stored in strictly ascending order of values',
          'Elements are stored in strictly decreasing order of values from front to back',
          'Elements alternate between positive and negative numbers',
          'The front is always the median value'
        ],
        correctOptionIndex: 1,
        userSelectedIndex: 1,
        isAnsweredCorrectly: true,
        explanation: 'A decreasing monotonic deque maintains values in strictly descending order. Thus, the front element is always the maximum of the active window.',
        relatedConceptNodeId: 'node-sw-deque'
      },
      {
        id: 'quiz-sw-02-b',
        question: 'Why can an existing element in the deque be safely popped from the back when a new element nums[i] is greater than or equal to it?',
        options: [
          'To conserve RAM memory',
          'Because the older, smaller element will expire before or at the same time as nums[i], and can NEVER be the maximum in any future window that contains nums[i]',
          'Because deques cannot exceed size 3',
          'To invert the sign of the numbers'
        ],
        correctOptionIndex: 1,
        userSelectedIndex: null,
        isAnsweredCorrectly: false,
        explanation: 'The new element nums[i] is both larger and will stay in future windows longer than the older element. The older element is permanently dominated and can never be chosen as the maximum.',
        relatedConceptNodeId: 'node-sw-deque'
      },
      {
        id: 'quiz-sw-02-c',
        question: 'Where is the current window maximum always located in the monotonic deque?',
        options: ['At the back of the deque (deque.back())', 'At the front of the deque (deque.front())', 'In the exact center of the deque', 'In an external variable'],
        correctOptionIndex: 1,
        userSelectedIndex: null,
        isAnsweredCorrectly: false,
        explanation: 'Because the deque is maintained in strictly decreasing order, the largest valid element is always at the front.',
        relatedConceptNodeId: 'node-sw-deque'
      },
      {
        id: 'quiz-sw-02-d',
        question: 'If the array elements are strictly sorted in descending order (e.g. [9, 8, 7, 6, 5]), how many elements remain in the deque at each step?',
        options: ['At most 1 element', 'Exactly k elements (the full window)', '0 elements', 'N elements'],
        correctOptionIndex: 1,
        userSelectedIndex: null,
        isAnsweredCorrectly: false,
        explanation: 'Since each new element is smaller than the previous, no back-popping occurs during step 2. The deque holds all k elements until front expiration begins.',
        relatedConceptNodeId: 'node-sw-deque'
      },

      // Node 3: node-sw-eviction
      {
        id: 'quiz-sw-03-a',
        question: 'What condition triggers an eviction of an index from the FRONT of the monotonic deque?',
        options: [
          'When nums[front] < 0',
          'When the front index satisfies front <= i - k, indicating it has fallen behind the sliding window\'s left boundary',
          'When the deque size reaches N',
          'When a duplicate number is found'
        ],
        correctOptionIndex: 1,
        userSelectedIndex: 1,
        isAnsweredCorrectly: true,
        explanation: 'When the window slides right to index i, any index less than or equal to i - k is outside the window [i - k + 1, i] and must be popped from the front.',
        relatedConceptNodeId: 'node-sw-eviction'
      },
      {
        id: 'quiz-sw-03-b',
        question: 'Can more than one element be evicted from the front of the deque in a single window step i?',
        options: [
          'Yes, up to k elements can expire at once',
          'No, at most ONE element can expire per step because the window advances by exactly one position per iteration',
          'Eviction occurs only every 10 steps',
          'Only even indices can be evicted'
        ],
        correctOptionIndex: 1,
        userSelectedIndex: null,
        isAnsweredCorrectly: false,
        explanation: 'The window advances right by 1 step at a time. Only the single element at index i - k can become newly invalid on that step.',
        relatedConceptNodeId: 'node-sw-eviction'
      },
      {
        id: 'quiz-sw-03-c',
        question: 'What happens if the current maximum element in the window slides out of the window boundary?',
        options: [
          'The algorithm resets and re-scans the array',
          'It is popped from the front of the deque, and the NEXT largest element in the window immediately becomes the new front element',
          'The algorithm throws an exception',
          'The maximum defaults to 0'
        ],
        correctOptionIndex: 1,
        userSelectedIndex: null,
        isAnsweredCorrectly: false,
        explanation: 'Because the deque preserves sorted order of candidates, popping the expired front reveals the runner-up maximum in O(1) time.',
        relatedConceptNodeId: 'node-sw-eviction'
      },
      {
        id: 'quiz-sw-03-d',
        question: 'What is the maximum number of elements that the deque can hold simultaneously in memory?',
        options: ['k elements', 'N elements', 'log k elements', '2 elements'],
        correctOptionIndex: 0,
        userSelectedIndex: null,
        isAnsweredCorrectly: false,
        explanation: 'Because indices older than i - k are evicted, the deque can never contain more than k elements at any point.',
        relatedConceptNodeId: 'node-sw-eviction'
      },

      // Node 4: node-sw-amortized
      {
        id: 'quiz-sw-04-a',
        question: 'Why is the time complexity of the monotonic deque algorithm O(N) even though it contains a nested while loop inside the for loop?',
        options: [
          'Because the while loop only runs once in total',
          'By amortized analysis: each array index is pushed onto the deque exactly once and popped at most once, bounding total operations to at most 2N',
          'Because GPUs parallelize the while loop',
          'The while loop runs in O(1/N) time'
        ],
        correctOptionIndex: 1,
        userSelectedIndex: 1,
        isAnsweredCorrectly: true,
        explanation: 'Even though an individual iteration may pop multiple elements, an element once popped is never revisited. Over all N iterations, total pops <= N, guaranteeing O(N) amortized time.',
        relatedConceptNodeId: 'node-sw-amortized'
      },
      {
        id: 'quiz-sw-04-b',
        question: 'What is the space complexity of the monotonic deque sliding window approach (excluding the output array)?',
        options: ['O(1)', 'O(k)', 'O(N)', 'O(N * k)'],
        correctOptionIndex: 1,
        userSelectedIndex: null,
        isAnsweredCorrectly: false,
        explanation: 'The deque holds indices strictly within the current window of size k, requiring O(k) auxiliary memory.',
        relatedConceptNodeId: 'node-sw-amortized'
      },
      {
        id: 'quiz-sw-04-c',
        question: 'How does the monotonic deque approach compare in runtime against a balanced binary search tree (std::multiset) sliding window?',
        options: [
          'Multiset is O(N log k) due to tree rebalancing; deque is O(N) strictly linear',
          'Multiset is faster because it uses red-black trees',
          'They have identical performance',
          'Deque has O(N^2) worst case'
        ],
        correctOptionIndex: 0,
        userSelectedIndex: null,
        isAnsweredCorrectly: false,
        explanation: 'A balanced BST requires O(log k) for each insert and delete, resulting in O(N log k). The monotonic deque eliminates tree overhead and operates in O(N) linear time.',
        relatedConceptNodeId: 'node-sw-amortized'
      },
      {
        id: 'quiz-sw-04-d',
        question: 'Can the same monotonic deque approach be adapted to solve the "Sliding Window Minimum" problem?',
        options: [
          'No, monotonic deques only work for finding maximums',
          'Yes, by simply maintaining a strictly INCREASING monotonic deque (nums[deque.back()] >= nums[i] popped from back)',
          'Only if all numbers in the array are negative',
          'Only if the array is pre-sorted'
        ],
        correctOptionIndex: 1,
        userSelectedIndex: null,
        isAnsweredCorrectly: false,
        explanation: 'Inverting the comparison to pop larger elements maintains an increasing deque where the front element is always the minimum of the active window.',
        relatedConceptNodeId: 'node-sw-amortized'
      }
    ],
    notes: [
      {
        id: 'note-sw-01',
        title: 'Monotonic Deque Invariant and Mechanics',
        category: 'Core Mechanics',
        content: `**Monotonic Decreasing Deque Implementation:**
\`\`\`cpp
vector<int> maxSlidingWindow(vector<int>& nums, int k) {
  deque<int> dq; // stores indices
  vector<int> result;
  
  for (int i = 0; i < nums.size(); i++) {
    // 1. Evict elements out of window range [i - k + 1, i]
    if (!dq.empty() && dq.front() <= i - k) dq.pop_front();
    
    // 2. Maintain strictly decreasing monotonicity from back
    while (!dq.empty() && nums[dq.back()] <= nums[i]) {
      dq.pop_back();
    }
    
    // 3. Push current element index
    dq.push_back(i);
    
    // 4. Record current window maximum
    if (i >= k - 1) {
      result.push_back(nums[dq.front()]);
    }
  }
  return result;
}
\`\`\``,
        updatedAt: 'Nov 8, 2026'
      }
    ],
    researchPaper: {
      title: 'Sliding-Window Aggregation in Linear Time',
      authors: 'Richard E. Ladner, Michael J. Fischer',
      conference: 'ACM Symposium on Principles of Database Systems (PODS)',
      year: 1980,
      arxivUrl: 'https://en.wikipedia.org/wiki/Monotone_priority_queue',
      abstract:
        'A formal treatise on maintaining associative aggregations over sliding windows with amortized constant time per window advance using double-ended queues.',
      keyContributions: [
        'Proof of O(N) lower bound for general sliding window extrema',
        'Invention of the monotonic deque data structure for non-invertible semigroups',
        'Elimination of heap overhead in streaming real-time time-series telemetry'
      ],
      methodologicalBreakdown:
        'The paper introduces the concept of amortized lifetime accounting where each item incurs exactly one entry and exit amortized cost.'
    },
    knowledgeGraph: {
      rootNodeId: 'node-root-sw',
      nodes: [
        {
          id: 'node-root-sw',
          label: 'Sliding Window Maximum',
          category: 'Algorithm Problem',
          depth: 1,
          status: 'mastered',
          importance: 'critical',
          summary: 'Find the maximum value inside a moving window of size k.',
          shortLine: 'O(N) amortized linear extrema extraction',
          keyFormula: 'max(nums[i - k + 1 ... i])',
          failureMode: 'Naive scanning yields O(N·k) quadratic runtime exceeding TLE.',
          tier: 'macro',
          x: 280,
          y: 40
        },
        {
          id: 'node-sw-deque',
          label: 'Decreasing Monotonic Deque',
          category: 'Data Structure',
          depth: 2,
          status: 'mastered',
          importance: 'critical',
          summary: 'Double-ended queue maintaining strictly decreasing values.',
          shortLine: 'nums[front] > nums[...] > nums[back] invariant',
          keyFormula: 'nums[dq.front()] = current window max',
          failureMode: 'Storing values instead of indices prevents boundary eviction.',
          tier: 'standard',
          x: 120,
          y: 180
        },
        {
          id: 'node-sw-eviction',
          label: 'Out-of-Bounds Index Eviction',
          category: 'Window Invariant',
          depth: 2,
          status: 'mastered',
          importance: 'foundational',
          summary: 'Removes front element once it slides past the window horizon.',
          shortLine: 'front <= i - k ⟹ pop_front()',
          keyFormula: 'if (dq.front() <= i - k) dq.pop_front()',
          failureMode: 'Failing to evict stale indices produces expired maximums.',
          tier: 'standard',
          x: 440,
          y: 180
        },
        {
          id: 'node-sw-amortized',
          label: 'Amortized O(N) Analysis',
          category: 'Complexity Proof',
          depth: 3,
          status: 'mastered',
          importance: 'critical',
          summary: 'Each element enters and exits deque at most once across entire run.',
          shortLine: 'Total pops <= N ⟹ strictly linear 2N operations',
          keyFormula: 'Total operations <= 2N = O(N)',
          failureMode: 'Using a balanced BST incurs O(N log k) tree rebalancing overhead.',
          tier: 'standard',
          x: 280,
          y: 320
        }
      ],
      edges: [
        { id: 'e-sw-1', source: 'node-root-sw', target: 'node-sw-deque', label: 'Maintained By' },
        { id: 'e-sw-2', source: 'node-sw-deque', target: 'node-sw-eviction', label: 'Constrained By' },
        { id: 'e-sw-3', source: 'node-sw-deque', target: 'node-sw-amortized', label: 'Achieves' }
      ]
    }
  }
];
