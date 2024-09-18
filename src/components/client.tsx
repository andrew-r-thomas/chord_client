import useWebSocket, { ReadyState } from "react-use-websocket";
import { Button } from "./ui/button";
import { useEffect, useState } from "react";
import { DirectedGraph } from "graphology";
import { SigmaContainer } from "@react-sigma/core";
import "@react-sigma/core/lib/react-sigma.min.css";
import { circular } from "graphology-layout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Slider } from "./ui/slider";
import { Label } from "./ui/label";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, YAxis } from "recharts"
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

type NodeData = {
	addr: string,
	fingers: string[],
	len: number,
}

type Latency = {
	ms: number,
}

export const Client = () => {
	let { sendMessage, lastMessage, readyState } = useWebSocket("ws://0.0.0.0:3000/ws");

	const connectionStatus = {
		[ReadyState.CONNECTING]: 'Connecting',
		[ReadyState.OPEN]: 'Open',
		[ReadyState.CLOSING]: 'Closing',
		[ReadyState.CLOSED]: 'Closed',
		[ReadyState.UNINSTANTIATED]: 'Uninstantiated',
	}[readyState];
	const connColor = {
		[ReadyState.CLOSED]: "red-500",
		[ReadyState.OPEN]: "green-500",
		[ReadyState.UNINSTANTIATED]: "slate-500",
		[ReadyState.CONNECTING]: "yellow-500",
		[ReadyState.CLOSING]: "orage-500",
	}[readyState];

	const [graph, _] = useState(new DirectedGraph());
	const [nodes, setNodes] = useState(20);
	const [nodeData, setNodeData] = useState<NodeData[]>([]);
	const [haikus, setHaikus] = useState<string[]>(["", "", "", "", ""]);
	const [latencyTotal, setLatencyTotal] = useState(0);
	const [nHaikus, setNHaikus] = useState(0);
	const [dataLen, setDataLen] = useState(0);

	const [latencyAvg, setLatencyAvg] = useState<Latency[]>([]);

	useEffect(
		() => {
			if (lastMessage) {
				let message = JSON.parse(lastMessage.data);
				switch (Object.keys(message)[0]) {
					case "NodeData":
						let data: NodeData[] = message["NodeData"];
						let n = 0;
						let len = 0;
						graph.clear();
						for (let node of data) {
							graph.mergeNode(node.addr, {
								x: 0,
								y: 0,
								label: node.addr,
								size: 5 + (node.len / 250),
							});
							n += 1;
							len += node.len;
						}
						for (let node of data) {
							for (let finger of node.fingers) {
								graph.mergeEdge(node.addr, finger);

							}
						}
						circular.assign(graph);
						setNodeData(data);
						setDataLen(len);
						break;
					case "Haiku":
						setHaikus([message["Haiku"][0], ...haikus.slice(0, 4)])
						setNHaikus(nHaikus + 1);
						setLatencyTotal(latencyTotal + message["Haiku"][1]);

						setLatencyAvg([...latencyAvg, { ms: latencyTotal / nHaikus }]);
						break;
				}
			}
		}, [lastMessage]
	);

	const dataSpreadConfig = {
		len: {
			label: "Entries",
			color: "hsl(var(--chart-1))",
		},
	} satisfies ChartConfig

	const getLatencyConfig = {
		ms: {
			label: "latency (ms)",
			color: "hsl(var(--chart-2))",
		}
	} satisfies ChartConfig


	return (
		<div className="flex p-8 flex-row w-screen h-screen space-x-8 justify-between">
			<div className="w-1/4 h-full flex flex-col space-y-8">
				<Card>
					<CardHeader>
						<CardTitle>Data Spread</CardTitle>
						<CardDescription>Number of entries in each node</CardDescription>
					</CardHeader>
					<CardContent>
						<ChartContainer config={dataSpreadConfig} className="min-h-[50px]">
							<BarChart accessibilityLayer data={nodeData} >
								<YAxis dataKey="len" tickLine={false} axisLine={false} orientation="left" width={30} />
								<ChartTooltip
									cursor={false}
									content={<ChartTooltipContent />}
								/>
								<Bar dataKey="len" fill="var(--color-len)" radius={4} />
							</BarChart>
						</ChartContainer>
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle>
							"Get" Latency
						</CardTitle>
						<CardDescription>
							Cumulative average latency in milliseconds for get operations
						</CardDescription>
					</CardHeader>
					<CardContent>
						<ChartContainer config={getLatencyConfig} >
							<AreaChart accessibilityLayer data={latencyAvg}>
								<YAxis dataKey="ms" tickLine={false} axisLine={false} orientation="left" width={30} />
								<ChartTooltip
									cursor={false}
									content={<ChartTooltipContent />}
								/>
								<Area
									dataKey="ms"
									type="natural"
									fill="var(--color-ms)"
									fillOpacity={0.4}
									stroke="var(--color-ms)"
								/>
							</AreaChart>
						</ChartContainer>
					</CardContent>
				</Card>
			</div>
			<SigmaContainer settings={{ defaultEdgeType: "arrow" }} className="rounded-xl border-2 w-full" style={{ background: "inherit", color: "white" }} graph={graph} />
			<div className="flex flex-col space-y-2 w-1/4">
				<Card>
					<CardHeader className="p-4">
						<div className="flex flex-row items-center justify-between">
							<div>
								<CardTitle>Connection</CardTitle>
								<CardDescription>{connectionStatus}</CardDescription>
							</div>
							<span className="relative flex h-3 w-3">
								<span className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-${connColor} opacity-75`}></span>
								<span className={`relative inline-flex rounded-full h-3 w-3 bg-${connColor}`}></span>
							</span>
						</div>
					</CardHeader>
				</Card>
				<p>data len: {dataLen}</p>
				<p>node count: {nodeData.length}</p>
				<div className="flex w-full items-center justify-between flex-row space-x-4">
					<Label>{nodes}</Label>
					<Slider onValueChange={(n) => setNodes(n[0])} defaultValue={[20]} min={1} max={50} step={1} />
				</div>
				<Button onClick={() => sendMessage(JSON.stringify({ "Start": { nodes: nodes } }))} disabled={readyState !== ReadyState.OPEN}>send start message</Button>
				<ul className="flex flex-col space-y-8">
					{
						haikus.map(h => (
							<li className="whitespace-pre-line">{h}</li>
						))
					}
				</ul>
			</div>
		</div>
	)

};

