import useWebSocket, { ReadyState } from "react-use-websocket";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { DirectedGraph } from "graphology";
import { SigmaContainer } from "@react-sigma/core";
import "@react-sigma/core/lib/react-sigma.min.css";
import { circular } from "graphology-layout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Bar, BarChart, XAxis, YAxis } from "recharts"
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info, LoaderCircle } from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";

type PollData = {
	nodes: NodeData[],
	total_get_len: number,
	total_set_len: number,
	total_gets: number,
	total_sets: number,
	popular_quotes: Quote[],
}
type NodeData = {
	addr: string,
	fingers: string[],
	len: number,
}

type Quote = {
	quote: string,
	author: string,
	gets: number,
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
		[ReadyState.CLOSED]: "bg-red-500",
		[ReadyState.OPEN]: "bg-green-500",
		[ReadyState.UNINSTANTIATED]: "bg-slate-500",
		[ReadyState.CONNECTING]: "bg-yellow-500",
		[ReadyState.CLOSING]: "bg-orage-500",
	}[readyState];

	const [graph, _] = useState(new DirectedGraph());
	const [dataLen, setDataLen] = useState(0);
	const [nodeData, setNodeData] = useState<NodeData[]>([]);

	const [quotes, setQuotes] = useState<Quote[]>([]);
	const [totalGetPathLen, setTotalGetPathLen] = useState(0);
	const [totalGets, setTotalGets] = useState(0);
	const [totalSetPathLen, setTotalSetPathLen] = useState(0);
	const [totalSets, setTotalSets] = useState(0);

	const [nodes, setNodes] = useState(20);
	const [activityLevel, setActivityLevel] = useState(100);
	const [getAffinity, setGetAffinity] = useState(50);
	const [stabilizeFreq, setStabilizeFreq] = useState(100);
	const [fixFingersFreq, setFixFingersFreq] = useState(100);
	const [pollRate, setPollRate] = useState(100);

	const [simStatus, setSimStatus] = useState<"stopped" | "started">("stopped");
	const [startPending, setStartPending] = useState(false);
	const [stopPending, setStopPending] = useState(false);

	useEffect(
		() => {
			if (lastMessage) {
				let message = JSON.parse(lastMessage.data);
				switch (Object.keys(message)[0]) {
					case "PollData":
						let data: PollData = message["PollData"];
						let n = 0;
						let len = 0;
						graph.clear();
						for (let node of data.nodes) {
							graph.mergeNode(node.addr, {
								x: 0,
								y: 0,
								label: node.addr,
								size: 5 + (node.len / 250),
								color: "white"
							});
							n += 1;
							len += node.len;
						}
						for (let node of data.nodes) {
							for (let finger of node.fingers) {
								graph.mergeEdge(node.addr, finger, { color: "white" });

							}
						}
						circular.assign(graph);
						setNodeData(data.nodes);
						setDataLen(len);
						setTotalGetPathLen(data.total_get_len);
						setTotalGets(data.total_gets);
						setTotalSetPathLen(data.total_set_len);
						setTotalSets(data.total_sets);
						setQuotes(data.popular_quotes);
						break;
					case "Ctrl":
						switch (message["Ctrl"]) {
							case "Started":
								setSimStatus("started");
								setStartPending(false);
								break;
							case "Stopped":
								setSimStatus("stopped");
								setStopPending(false);
								break;
						}
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

	const getPathConfig = {
		len: {
			label: "Avg Len",
			color: "hsl(var(--chart-2))",
		}
	} satisfies ChartConfig

	return (
		<div className="flex p-8 flex-col w-screen h-screen space-y-8 justify-between">
			<div className="flex flex-row w-full h-full space-x-8 justify-between">
				<div className="w-1/3 h-full flex flex-col space-y-8">
					<Card>
						<CardHeader>
							<CardTitle>Data Spread</CardTitle>
							<CardDescription>Number of entries in each node</CardDescription>
						</CardHeader>
						<CardContent>
							<ChartContainer config={dataSpreadConfig} className="min-h-[50px]">
								<BarChart accessibilityLayer data={nodeData} >
									<YAxis dataKey="len" tickLine={false} axisLine={false} orientation="left" width={35} />
									<XAxis dataKey="addr" hide />
									<ChartTooltip
										cursor={false}
										content={<ChartTooltipContent />}
									/>
									<Bar dataKey="len" fill="var(--color-len)" radius={4} />
								</BarChart>
							</ChartContainer>
						</CardContent>
						<CardFooter className="flex flex-row space-x-2">
							<Label>Total Entries:</Label> <p>{dataLen}</p>
						</CardFooter>
					</Card>
					<Card>
						<CardHeader>
							<CardTitle>
								Average Path Length
							</CardTitle>
							<CardDescription>
								Cummulative average number of nodes visited per operation
							</CardDescription>
						</CardHeader>
						<CardContent>
							<ChartContainer config={getPathConfig} >
								<BarChart accessibilityLayer data={[{ type: `Gets: ${totalGets}`, len: totalGetPathLen / totalGets }, { type: `Sets: ${totalSets}`, len: totalSetPathLen / totalSets }]}>
									<YAxis dataKey="len" width={35} tickLine={false} axisLine={false} />
									<XAxis dataKey="type" tickLine={false} axisLine={false} />
									<ChartTooltip
										cursor={false}
										wrapperClassName="flex flex-row space-x-2"
										content={<ChartTooltipContent />}
									/>
									<Bar
										dataKey="len"
										type="natural"
										fill="var(--color-len)"
										fillOpacity={0.4}
										stroke="var(--color-len)"
									/>
								</BarChart>
							</ChartContainer>
						</CardContent>
					</Card>
				</div>
				<SigmaContainer settings={{ defaultEdgeType: "arrow", renderLabels: false }} className="rounded-xl border-2 w-full" style={{ background: "inherit", color: "white" }} graph={graph} />
				<div className="flex flex-col space-y-8 w-1/3">
					<Card>
						<CardHeader className="p-4">
							<div className="flex flex-row items-center justify-between">
								<div>
									<CardTitle>Connection</CardTitle>
									<CardDescription>{connectionStatus}</CardDescription>
								</div>
								<span className="relative flex h-3 w-3">
									<span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${connColor} opacity-75`}></span>
									<span className={`relative inline-flex rounded-full h-3 w-3 ${connColor}`}></span>
								</span>
							</div>
						</CardHeader>
					</Card>
					{
						simStatus === "started" ? <Button onClick={
							() => {
								setStopPending(true)
								sendMessage(JSON.stringify("Stop"))
							}
						} variant="destructive">
							{stopPending ? <LoaderCircle className="animate-spin" /> : "Stop"}
						</Button> :
							<Button
								onClick={
									() => {
										setStartPending(true);
										sendMessage(
											JSON.stringify({
												"Start": {
													poll_rate: pollRate,
													nodes: nodes,
													activity_level: activityLevel,
													get_affinity: getAffinity,
													stabilize_freq: stabilizeFreq,
													fix_finger_freq: fixFingersFreq
												}
											})
										)
									}
								}
								disabled={readyState !== ReadyState.OPEN}
							>
								{
									startPending ? <LoaderCircle className="animate-spin" /> : "Start"
								}
							</Button>
					}
					<div className="flex flex-col h-full space-y-8">
						<div className="flex w-full flex-col space-y-4">
							<Label className="flex flex-row items-center space-x-2">
								<TooltipProvider>
									<Tooltip>
										<TooltipTrigger asChild>
											<Info size={15} />
										</TooltipTrigger>
										<TooltipContent align="center" className="w-24">
											<p>The conductor will poll nodes every {pollRate} milleseconds</p>
										</TooltipContent>
									</Tooltip>
								</TooltipProvider>
								<span className="font-bold">Poll Rate</span>
								<span>{pollRate}ms</span>
							</Label>
							<Slider disabled={simStatus === "started"} onValueChange={(n) => setPollRate(n[0])} defaultValue={[100]} min={10} max={1000} step={1} />
						</div>
						<div className="flex w-full flex-col space-y-4">
							<Label className="flex flex-row items-center space-x-2">
								<TooltipProvider>
									<Tooltip>
										<TooltipTrigger asChild>
											<Info size={15} />
										</TooltipTrigger>
										<TooltipContent align="center" className="w-24">
											<p >There will be {nodes} nodes in circulation</p>
										</TooltipContent>
									</Tooltip>
								</TooltipProvider>
								<span className="font-bold">Nodes</span>
								<span>{nodes}</span>
							</Label>
							<Slider disabled={simStatus === "started"} onValueChange={(n) => setNodes(n[0])} defaultValue={[20]} min={1} max={50} step={1} />
						</div>
						<div className="flex w-full flex-col space-y-4">
							<Label className="flex flex-row items-center space-x-2">
								<TooltipProvider>
									<Tooltip>
										<TooltipTrigger asChild>
											<Info size={15} />
										</TooltipTrigger>
										<TooltipContent align="center" className="w-24">
											<p>
												Each node will perform a get or set operation every {activityLevel} milleseconds
											</p>
										</TooltipContent>
									</Tooltip>
								</TooltipProvider>
								<span className="font-bold">
									Activity Level
								</span>
								<span>{activityLevel}ms</span>
							</Label>
							<Slider disabled={simStatus === "started"} onValueChange={(n) => setActivityLevel(n[0])} defaultValue={[100]} min={10} max={1000} step={1} />
						</div>
						<div className="flex w-full flex-col space-y-4">
							<Label className="flex flex-row items-center space-x-2">
								<TooltipProvider>
									<Tooltip>
										<TooltipTrigger asChild>
											<Info size={15} />
										</TooltipTrigger>
										<TooltipContent align="center" className="w-24">
											<p>
												Nodes will perform gets {getAffinity}% of the time, and sets {100 - getAffinity}% of the time
											</p>
										</TooltipContent>
									</Tooltip>
								</TooltipProvider>
								<span className="font-bold">
									Get Affinity
								</span>
								<span>
									{getAffinity}%
								</span>
							</Label>
							<Slider disabled={simStatus === "started"} onValueChange={(n) => setGetAffinity(n[0])} defaultValue={[50]} min={0} max={100} step={1} />
						</div>
						<div className="flex w-full flex-col space-y-4">
							<Label className="flex flex-row items-center space-x-2" >
								<TooltipProvider>
									<Tooltip>
										<TooltipTrigger asChild>
											<Info size={15} />
										</TooltipTrigger>
										<TooltipContent align="center" className="w-24">
											<p>
												Nodes will perform the stabilize proceedure every {stabilizeFreq} milleseconds
											</p>
										</TooltipContent>
									</Tooltip>
								</TooltipProvider>
								<span className="font-bold">
									Stabilize Freq
								</span>
								<span>
									{stabilizeFreq}ms
								</span>
							</Label>
							<Slider disabled={simStatus === "started"} onValueChange={(n) => setStabilizeFreq(n[0])} defaultValue={[100]} min={10} max={1000} step={1} />
						</div>
						<div className="flex w-full flex-col space-y-4">
							<Label className="flex flex-row items-center space-x-2">
								<TooltipProvider>
									<Tooltip>
										<TooltipTrigger asChild>
											<Info size={15} />
										</TooltipTrigger>
										<TooltipContent align="center" className="w-24">
											<p>
												Nodes will perform the fix fingers proceedure every {fixFingersFreq} milleseconds
											</p>
										</TooltipContent>
									</Tooltip>
								</TooltipProvider>
								<span className="font-bold">
									Fix Fingers Freq
								</span>
								<span>
									{fixFingersFreq}ms
								</span>
							</Label>
							<Slider disabled={simStatus === "started"} onValueChange={(n) => setFixFingersFreq(n[0])} defaultValue={[100]} min={10} max={1000} step={1} />
						</div>
					</div>
				</div>
			</div>
			<div className="flex flex-col w-full h-1/3 space-y-4">
				<h2 className="text-lg font-bold">Top Quotes</h2>
				<div className="flex flex-row space-x-4">
					{
						quotes.map(q => (<Card className="w-1/5 flex flex-col">
							<CardHeader>
								<CardTitle>
									{q.author}
								</CardTitle>
							</CardHeader>
							<CardContent className="flex flex-grow" >
								<ScrollArea className="flex max-h-[6rem] overflow-y-auto">
									{q.quote}
								</ScrollArea>
							</CardContent>
							<CardFooter>
								<Label>
									Total Gets: {q.gets}
								</Label>
							</CardFooter>
						</Card>))
					}</div>
			</div>
		</div>
	)
};

