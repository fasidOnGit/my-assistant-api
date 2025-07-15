[
	{
		type: 'function',
		function: {
			name: 'searchVectorDB',
			description: "Search the user's resume, projects, and background for semantically relevant information.",
			parameters: {
				type: 'object',
				properties: {
					query: {
						type: 'string',
						description: "A semantic query, such as 'challenging project', 'frontend work', or 'healthcare problem'",
					},
				},
				required: ['query'],
			},
		},
	},
];
